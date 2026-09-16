use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::menu::{MenuBuilder, MenuItem, MenuItemBuilder, PredefinedMenuItem};
use tauri::tray::{TrayIcon, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, Runtime};

use crate::window;

pub const TRAY_ID: &str = "octelium";

const MENU_OPEN: &str = "open";
const MENU_STATUS: &str = "status";
const MENU_CONNECT: &str = "connect";
const MENU_DISCONNECT: &str = "disconnect";
const MENU_SETTINGS: &str = "settings";
const MENU_CLUSTERS: &str = "clusters";
const MENU_QUIT: &str = "quit";

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrayDomain {
    pub domain: String,
    pub connected: bool,
    pub busy: bool,
    pub authenticated: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TraySummary {
    pub available: bool,
    pub domains: Vec<TrayDomain>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TrayAction {
    action: String,
    domain: Option<String>,
    path: Option<String>,
}

struct TrayState<R: Runtime> {
    status: MenuItem<R>,
    connect: MenuItem<R>,
    disconnect: MenuItem<R>,
    domain: Mutex<Option<String>>,
}

pub fn create<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<TrayIcon<R>> {
    let status = MenuItemBuilder::with_id(MENU_STATUS, "The daemon is not running")
        .enabled(false)
        .build(app)?;
    let connect = MenuItemBuilder::with_id(MENU_CONNECT, "Connect")
        .enabled(false)
        .build(app)?;
    let disconnect = MenuItemBuilder::with_id(MENU_DISCONNECT, "Disconnect")
        .enabled(false)
        .build(app)?;
    let menu = MenuBuilder::new(app)
        .item(&MenuItemBuilder::with_id(MENU_OPEN, "Open Octelium").build(app)?)
        .item(&PredefinedMenuItem::separator(app)?)
        .item(&status)
        .item(&connect)
        .item(&disconnect)
        .item(&PredefinedMenuItem::separator(app)?)
        .item(&MenuItemBuilder::with_id(MENU_SETTINGS, "Settings").build(app)?)
        .item(&MenuItemBuilder::with_id(MENU_CLUSTERS, "Manage Clusters").build(app)?)
        .item(&PredefinedMenuItem::separator(app)?)
        .item(&MenuItemBuilder::with_id(MENU_QUIT, "Quit Octelium").build(app)?)
        .build()?;

    app.manage(TrayState {
        status,
        connect,
        disconnect,
        domain: Mutex::new(None),
    });

    let builder = TrayIconBuilder::with_id(TRAY_ID)
        .icon(app.default_window_icon().cloned().unwrap())
        .icon_as_template(true)
        .menu(&menu)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::DoubleClick { .. } = event {
                window::show(tray.app_handle());
            }
        })
        .on_menu_event(on_menu_event);

    #[cfg(not(target_os = "linux"))]
    let builder = builder
        .tooltip("Octelium — the daemon is not running")
        .show_menu_on_left_click(true);

    builder.build(app)
}

pub fn update<R: Runtime>(app: &AppHandle<R>, summary: &TraySummary) -> tauri::Result<()> {
    let state = app.state::<TrayState<R>>();
    let domain = summary.domains.first();
    *state.domain.lock().unwrap() = domain.map(|item| item.domain.clone());

    state.status.set_text(get_status_label(summary))?;
    state.connect.set_enabled(
        summary.available
            && domain.is_some_and(|item| item.authenticated && !item.connected && !item.busy),
    )?;
    state.disconnect.set_enabled(
        summary.available && domain.is_some_and(|item| item.connected && !item.busy),
    )?;

    #[cfg(not(target_os = "linux"))]
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        tray.set_tooltip(Some(get_tooltip(summary)))?;
    }

    Ok(())
}

fn get_status_label(summary: &TraySummary) -> String {
    if !summary.available {
        return "The daemon is not running".to_string();
    }

    match summary.domains.first() {
        None => "No Cluster configured".to_string(),
        Some(domain) if domain.busy => format!("{} — Working", domain.domain),
        Some(domain) if domain.connected => format!("{} — Connected", domain.domain),
        Some(domain) if domain.authenticated => format!("{} — Disconnected", domain.domain),
        Some(domain) => format!("{} — Signed out", domain.domain),
    }
}

#[cfg(not(target_os = "linux"))]
fn get_tooltip(summary: &TraySummary) -> String {
    format!("Octelium — {}", get_status_label(summary))
}

fn on_menu_event<R: Runtime>(app: &AppHandle<R>, event: tauri::menu::MenuEvent) {
    let id = event.id().as_ref();

    match id {
        MENU_OPEN => window::show(app),
        MENU_QUIT => app.exit(0),
        MENU_SETTINGS | MENU_CLUSTERS => {
            window::show(app);
            emit(
                app,
                TrayAction {
                    action: "navigate".to_string(),
                    domain: None,
                    path: Some(format!("/{id}")),
                },
            );
        }
        MENU_CONNECT | MENU_DISCONNECT => {
            let domain = app.state::<TrayState<R>>().domain.lock().unwrap().clone();
            if domain.is_some() {
                emit(
                    app,
                    TrayAction {
                        action: id.to_string(),
                        domain,
                        path: None,
                    },
                );
            }
        }
        _ => {}
    }
}

fn emit<R: Runtime>(app: &AppHandle<R>, action: TrayAction) {
    let _ = app.emit("tray-action", action);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_status_labels() {
        assert_eq!(
            get_status_label(&TraySummary {
                available: false,
                domains: vec![],
            }),
            "The daemon is not running"
        );
        assert_eq!(
            get_status_label(&TraySummary {
                available: true,
                domains: vec![TrayDomain {
                    domain: "example.com".to_string(),
                    connected: true,
                    busy: false,
                    authenticated: true,
                }],
            }),
            "example.com — Connected"
        );
    }
}
