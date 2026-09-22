use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::image::Image;
use tauri::menu::{MenuBuilder, MenuItem, MenuItemBuilder, PredefinedMenuItem};
use tauri::tray::{TrayIcon, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, Runtime};

use crate::window;

pub const TRAY_ID: &str = "octelium";

macro_rules! tray_art {
    ($dir:literal) => {
        mod art {
            pub const LOGO_LIGHT: &[u8] =
                include_bytes!(concat!("../icons/tray/", $dir, "/logo-light.png"));
            pub const LOGO_DARK: &[u8] =
                include_bytes!(concat!("../icons/tray/", $dir, "/logo-dark.png"));
            pub const CONNECTED_LIGHT: &[u8] =
                include_bytes!(concat!("../icons/tray/", $dir, "/connected-light.png"));
            pub const CONNECTED_DARK: &[u8] =
                include_bytes!(concat!("../icons/tray/", $dir, "/connected-dark.png"));
            pub const SIGNED_OUT_LIGHT: &[u8] =
                include_bytes!(concat!("../icons/tray/", $dir, "/signed-out-light.png"));
            pub const SIGNED_OUT_DARK: &[u8] =
                include_bytes!(concat!("../icons/tray/", $dir, "/signed-out-dark.png"));
        }
    };
}

#[cfg(target_os = "macos")]
tray_art!("macos");
#[cfg(target_os = "windows")]
tray_art!("windows");
#[cfg(not(any(target_os = "macos", target_os = "windows")))]
tray_art!("linux");

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
    pub dark: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TrayAction {
    action: String,
    domain: Option<String>,
    path: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Status {
    Unavailable,
    SignedOut,
    Disconnected,
    Busy,
    Connected,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Appearance {
    Light,
    Dark,
}

struct TrayState<R: Runtime> {
    status: MenuItem<R>,
    connect: MenuItem<R>,
    disconnect: MenuItem<R>,
    domain: Mutex<Option<String>>,
    painted: Mutex<(Status, Appearance)>,
}

fn get_system_appearance<R: Runtime>(app: &AppHandle<R>) -> Appearance {
    let theme = app
        .get_webview_window(window::MAIN_WINDOW)
        .and_then(|window| window.theme().ok())
        .unwrap_or(tauri::Theme::Light);

    match theme {
        tauri::Theme::Dark => Appearance::Dark,
        _ => Appearance::Light,
    }
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

    let appearance = get_system_appearance(app);

    app.manage(TrayState {
        status,
        connect,
        disconnect,
        domain: Mutex::new(None),
        painted: Mutex::new((Status::Unavailable, appearance)),
    });

    let builder = TrayIconBuilder::with_id(TRAY_ID)
        .icon(Image::from_bytes(get_icon(Status::Unavailable, appearance))?)
        .icon_as_template(false)
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

    let status = get_status(summary);
    let appearance = if summary.dark {
        Appearance::Dark
    } else {
        Appearance::Light
    };
    let painted = (status, appearance);
    if *state.painted.lock().unwrap() == painted {
        return Ok(());
    }

    set_icon(app, get_icon(status, appearance))?;
    *state.painted.lock().unwrap() = painted;

    Ok(())
}

fn set_icon<R: Runtime>(app: &AppHandle<R>, icon: &'static [u8]) -> tauri::Result<()> {
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        tray.set_icon_with_as_template(Some(Image::from_bytes(icon)?), false)?;
    }

    Ok(())
}

fn get_status(summary: &TraySummary) -> Status {
    if !summary.available {
        return Status::Unavailable;
    }

    match summary.domains.first() {
        Some(domain) if domain.busy => Status::Busy,
        Some(domain) if domain.connected => Status::Connected,
        Some(domain) if domain.authenticated => Status::Disconnected,
        _ => Status::SignedOut,
    }
}

fn get_icon(status: Status, appearance: Appearance) -> &'static [u8] {
    match (status, appearance) {
        (Status::SignedOut, Appearance::Light) => art::SIGNED_OUT_LIGHT,
        (Status::SignedOut, Appearance::Dark) => art::SIGNED_OUT_DARK,
        (Status::Connected, Appearance::Light) => art::CONNECTED_LIGHT,
        (Status::Connected, Appearance::Dark) => art::CONNECTED_DARK,
        (_, Appearance::Light) => art::LOGO_LIGHT,
        (_, Appearance::Dark) => art::LOGO_DARK,
    }
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

    fn summary(available: bool, domain: Option<TrayDomain>) -> TraySummary {
        TraySummary {
            available,
            dark: false,
            domains: domain.into_iter().collect(),
        }
    }

    fn domain(connected: bool, busy: bool, authenticated: bool) -> TrayDomain {
        TrayDomain {
            domain: "example.com".to_string(),
            connected,
            busy,
            authenticated,
        }
    }

    #[test]
    fn test_status_labels() {
        assert_eq!(
            get_status_label(&summary(false, None)),
            "The daemon is not running"
        );
        assert_eq!(
            get_status_label(&summary(true, None)),
            "No Cluster configured"
        );
        assert_eq!(
            get_status_label(&summary(true, Some(domain(true, false, true)))),
            "example.com — Connected"
        );
    }

    #[test]
    fn test_status() {
        assert_eq!(get_status(&summary(false, None)), Status::Unavailable);
        assert_eq!(
            get_status(&summary(false, Some(domain(true, false, true)))),
            Status::Unavailable
        );
        assert_eq!(get_status(&summary(true, None)), Status::SignedOut);
        assert_eq!(
            get_status(&summary(true, Some(domain(false, false, false)))),
            Status::SignedOut
        );
        assert_eq!(
            get_status(&summary(true, Some(domain(false, false, true)))),
            Status::Disconnected
        );
        assert_eq!(
            get_status(&summary(true, Some(domain(true, false, true)))),
            Status::Connected
        );
        assert_eq!(
            get_status(&summary(true, Some(domain(true, true, true)))),
            Status::Busy
        );
    }

    #[test]
    fn test_status_artwork() {
        assert_eq!(
            get_icon(Status::Unavailable, Appearance::Light),
            art::LOGO_LIGHT
        );
        assert_eq!(
            get_icon(Status::Disconnected, Appearance::Dark),
            art::LOGO_DARK
        );
        assert_eq!(get_icon(Status::Busy, Appearance::Light), art::LOGO_LIGHT);
        assert_eq!(
            get_icon(Status::SignedOut, Appearance::Dark),
            art::SIGNED_OUT_DARK
        );
        assert_eq!(
            get_icon(Status::Connected, Appearance::Light),
            art::CONNECTED_LIGHT
        );
    }
}
