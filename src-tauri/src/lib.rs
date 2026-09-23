mod commands;
mod state;
mod tray;
mod window;

use octelium_grpc::Client;
use tauri::Manager;
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_window_state::StateFlags;

use state::AppState;

fn get_user_agent(version: &str) -> String {
    format!("octelium-desktop/{version}")
}

fn get_window_state_flags() -> StateFlags {
    StateFlags::all() & !StateFlags::VISIBLE
}

pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            window::show(app);
        }));
    }

    builder
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_state_flags(get_window_state_flags())
                .build(),
        )
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .setup(|app| {
            let version = app.package_info().version.to_string();

            app.manage(AppState::new(Client::new(
                std::env::var("OCTELIUM_DAEMON_SOCKET").ok(),
                get_user_agent(&version),
            )));

            tray::create(app.handle())?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if window.label() == window::MAIN_WINDOW {
                    window.app_handle().state::<AppState>().cancel_every_call();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::grpc_unary,
            commands::grpc_server_streaming,
            commands::grpc_cancel,
            commands::grpc_invalidate_domain,
            commands::get_app_info,
            commands::open_external,
            commands::update_tray,
            commands::notify,
            commands::show_window,
            commands::quit_app,
        ])
        .run(tauri::generate_context!())
        .expect("Could not run the Octelium desktop application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_user_agent() {
        assert_eq!(get_user_agent("0.1.0"), "octelium-desktop/0.1.0");
    }

    #[test]
    fn test_get_window_state_flags() {
        let flags = get_window_state_flags();

        assert!(!flags.contains(StateFlags::VISIBLE));
        assert!(flags.contains(StateFlags::SIZE));
        assert!(flags.contains(StateFlags::POSITION));
    }
}
