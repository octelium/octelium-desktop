use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::image::Image;
use tauri::menu::{MenuBuilder, MenuItem, MenuItemBuilder, PredefinedMenuItem};
use tauri::tray::{TrayIcon, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, Runtime};

use crate::window;

pub const TRAY_ID: &str = "octelium";

macro_rules! tray_art {
    ($dir:literal, $template:literal) => {
        mod art {
            pub const IS_TEMPLATE: bool = $template;

            pub const CONNECTED: &[u8] =
                include_bytes!(concat!("../icons/tray/", $dir, "/connected.png"));
            pub const DISCONNECTED: &[u8] =
                include_bytes!(concat!("../icons/tray/", $dir, "/disconnected.png"));
            pub const SIGNED_OUT: &[u8] =
                include_bytes!(concat!("../icons/tray/", $dir, "/signed-out.png"));
            pub const UNAVAILABLE: &[u8] =
                include_bytes!(concat!("../icons/tray/", $dir, "/unavailable.png"));

            pub const BUSY: [&[u8]; 8] = [
                include_bytes!(concat!("../icons/tray/", $dir, "/busy-0.png")),
                include_bytes!(concat!("../icons/tray/", $dir, "/busy-1.png")),
                include_bytes!(concat!("../icons/tray/", $dir, "/busy-2.png")),
                include_bytes!(concat!("../icons/tray/", $dir, "/busy-3.png")),
                include_bytes!(concat!("../icons/tray/", $dir, "/busy-4.png")),
                include_bytes!(concat!("../icons/tray/", $dir, "/busy-5.png")),
                include_bytes!(concat!("../icons/tray/", $dir, "/busy-6.png")),
                include_bytes!(concat!("../icons/tray/", $dir, "/busy-7.png")),
            ];
        }
    };
}

#[cfg(target_os = "macos")]
tray_art!("macos", true);
#[cfg(target_os = "windows")]
tray_art!("windows", false);
#[cfg(not(any(target_os = "macos", target_os = "windows")))]
tray_art!("linux", false);

const SPINNER_INTERVAL: Duration = Duration::from_millis(140);

static SPINNER_GENERATION: AtomicU64 = AtomicU64::new(0);

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

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Status {
    Unavailable,
    SignedOut,
    Disconnected,
    Busy,
    Connected,
}

struct TrayState<R: Runtime> {
    status: MenuItem<R>,
    connect: MenuItem<R>,
    disconnect: MenuItem<R>,
    domain: Mutex<Option<String>>,
    painted: Mutex<Status>,
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
        painted: Mutex::new(Status::Unavailable),
    });

    let builder = TrayIconBuilder::with_id(TRAY_ID)
        .icon(Image::from_bytes(get_icon(Status::Unavailable))?)
        .icon_as_template(art::IS_TEMPLATE)
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
    if *state.painted.lock().unwrap() == status {
        return Ok(());
    }

    let generation = SPINNER_GENERATION.fetch_add(1, Ordering::SeqCst) + 1;
    set_icon(app, get_icon(status))?;
    *state.painted.lock().unwrap() = status;

    if status == Status::Busy {
        spin(app, generation);
    }

    Ok(())
}

fn set_icon<R: Runtime>(app: &AppHandle<R>, icon: &'static [u8]) -> tauri::Result<()> {
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        tray.set_icon_with_as_template(Some(Image::from_bytes(icon)?), art::IS_TEMPLATE)?;
    }

    Ok(())
}

fn spin<R: Runtime>(app: &AppHandle<R>, generation: u64) {
    let Some(tray) = app.tray_by_id(TRAY_ID) else {
        return;
    };

    std::thread::spawn(move || {
        let mut frame = 0;

        loop {
            std::thread::sleep(SPINNER_INTERVAL);

            if SPINNER_GENERATION.load(Ordering::SeqCst) != generation {
                break;
            }

            frame = (frame + 1) % art::BUSY.len();

            let Ok(image) = Image::from_bytes(art::BUSY[frame]) else {
                break;
            };

            if tray
                .set_icon_with_as_template(Some(image), art::IS_TEMPLATE)
                .is_err()
            {
                break;
            }
        }
    });
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

fn get_icon(status: Status) -> &'static [u8] {
    match status {
        Status::Unavailable => art::UNAVAILABLE,
        Status::SignedOut => art::SIGNED_OUT,
        Status::Disconnected => art::DISCONNECTED,
        Status::Busy => art::BUSY[0],
        Status::Connected => art::CONNECTED,
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
    fn test_every_status_has_distinct_artwork() {
        let icons = [
            Status::Unavailable,
            Status::SignedOut,
            Status::Disconnected,
            Status::Busy,
            Status::Connected,
        ]
        .map(get_icon);

        for (index, icon) in icons.iter().enumerate() {
            assert!(!icon.is_empty());
            assert!(!icons[index + 1..].contains(icon));
        }
    }
}
