use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use octelium_grpc::{Error as GrpcError, Target};
use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;
use tauri::{AppHandle, Manager, Runtime, State};
use tauri_plugin_notification::NotificationExt;
use url::Url;

const UNARY_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(30);

use crate::state::AppState;
use crate::tray::{self, TraySummary};

#[derive(Debug, Serialize)]
pub struct CommandError {
    pub code: i32,
    pub message: String,
}

impl From<GrpcError> for CommandError {
    fn from(arg: GrpcError) -> Self {
        Self {
            code: arg.code,
            message: arg.message,
        }
    }
}

impl CommandError {
    fn invalid_argument(message: impl Into<String>) -> Self {
        Self {
            code: tonic_code_invalid_argument(),
            message: message.into(),
        }
    }

    fn internal(message: impl Into<String>) -> Self {
        Self {
            code: tonic_code_internal(),
            message: message.into(),
        }
    }

    fn deadline_exceeded(message: impl Into<String>) -> Self {
        Self {
            code: 4,
            message: message.into(),
        }
    }
}

fn tonic_code_invalid_argument() -> i32 {
    3
}

fn tonic_code_internal() -> i32 {
    13
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TargetArg {
    Daemon,
    Cluster,
}

impl From<TargetArg> for Target {
    fn from(arg: TargetArg) -> Self {
        match arg {
            TargetArg::Daemon => Target::Daemon,
            TargetArg::Cluster => Target::Cluster,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum StreamEvent {
    Message { data: String },
    End { code: i32, message: String },
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub version: String,
    pub platform: String,
    pub arch: String,
    pub daemon_address: String,
}

fn decode_request(arg: &str) -> Result<Vec<u8>, CommandError> {
    STANDARD
        .decode(arg)
        .map_err(|err| CommandError::invalid_argument(err.to_string()))
}

#[tauri::command(rename_all = "camelCase")]
pub async fn grpc_unary(
    state: State<'_, AppState>,
    target: TargetArg,
    domain: Option<String>,
    method: String,
    request: String,
) -> Result<String, CommandError> {
    let request = decode_request(&request)?;

    let ret = tokio::time::timeout(
        UNARY_TIMEOUT,
        state
            .client
            .unary(target.into(), domain.as_deref(), &method, request),
    )
    .await
    .map_err(|_| CommandError::deadline_exceeded("The request timed out"))??;

    Ok(STANDARD.encode(ret))
}

#[tauri::command(rename_all = "camelCase")]
pub async fn grpc_server_streaming<R: Runtime>(
    app: AppHandle<R>,
    target: TargetArg,
    domain: Option<String>,
    method: String,
    request: String,
    on_event: Channel<StreamEvent>,
) -> Result<u64, CommandError> {
    let request = decode_request(&request)?;
    let target = Target::from(target);

    let mut stream = app
        .state::<AppState>()
        .client
        .server_streaming(target, domain.as_deref(), &method, request)
        .await?;

    let (id, mut cancel) = app.state::<AppState>().add_call();
    let handle = app.clone();

    tauri::async_runtime::spawn(async move {
        let pump = async {
            loop {
                match stream.message().await {
                    Ok(Some(message)) => {
                        if on_event
                            .send(StreamEvent::Message {
                                data: STANDARD.encode(message),
                            })
                            .is_err()
                        {
                            return None;
                        }
                    }
                    Ok(None) => {
                        return Some(StreamEvent::End {
                            code: 0,
                            message: String::new(),
                        })
                    }
                    Err(status) => {
                        return Some(StreamEvent::End {
                            code: status.code() as i32,
                            message: status.message().to_string(),
                        })
                    }
                }
            }
        };

        let ret = tokio::select! {
            _ = &mut cancel => Some(StreamEvent::End {
                code: 1,
                message: "The call was canceled".to_string(),
            }),
            ret = pump => {
                ret
            }
        };

        if let Some(ret) = ret {
            let _ = on_event.send(ret);
        }

        handle.state::<AppState>().finish_call(id);
    });

    Ok(id)
}

#[tauri::command(rename_all = "camelCase")]
pub async fn grpc_cancel(state: State<'_, AppState>, call_id: u64) -> Result<(), CommandError> {
    state.cancel_call(call_id);
    Ok(())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn grpc_invalidate_domain(
    state: State<'_, AppState>,
    domain: String,
) -> Result<(), CommandError> {
    state.client.invalidate_domain(&domain).await;
    Ok(())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn get_app_info<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, AppState>,
) -> Result<AppInfo, CommandError> {
    Ok(AppInfo {
        version: app.package_info().version.to_string(),
        platform: tauri_plugin_os::platform().to_string(),
        arch: tauri_plugin_os::arch().to_string(),
        daemon_address: state.client.address().to_string(),
    })
}

#[tauri::command(rename_all = "camelCase")]
pub async fn open_external(url: String) -> Result<(), CommandError> {
    let parsed = Url::parse(&url).map_err(|err| CommandError::invalid_argument(err.to_string()))?;

    if parsed.scheme() != "https" {
        return Err(CommandError::invalid_argument(
            "Only HTTPS URLs can be opened by this application",
        ));
    }

    if parsed.host().is_none() {
        return Err(CommandError::invalid_argument("The URL has no host"));
    }

    tauri_plugin_opener::open_url(parsed.as_str(), None::<&str>)
        .map_err(|err| CommandError::internal(err.to_string()))
}

#[tauri::command(rename_all = "camelCase")]
pub async fn update_tray<R: Runtime>(
    app: AppHandle<R>,
    summary: TraySummary,
) -> Result<(), CommandError> {
    tray::update(&app, &summary).map_err(|err| CommandError::internal(err.to_string()))
}

#[tauri::command(rename_all = "camelCase")]
pub async fn notify<R: Runtime>(
    app: AppHandle<R>,
    title: String,
    body: String,
) -> Result<(), CommandError> {
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|err| CommandError::internal(err.to_string()))
}

#[tauri::command(rename_all = "camelCase")]
pub async fn show_window<R: Runtime>(app: AppHandle<R>) -> Result<(), CommandError> {
    crate::window::show(&app);
    Ok(())
}

#[tauri::command(rename_all = "camelCase")]
pub async fn quit_app<R: Runtime>(app: AppHandle<R>) -> Result<(), CommandError> {
    app.state::<AppState>().cancel_every_call();
    app.exit(0);
    Ok(())
}
