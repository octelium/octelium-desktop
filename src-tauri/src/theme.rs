use std::sync::Mutex;
use std::time::Duration;

use dbus::arg::Variant;
use dbus::blocking::Connection;
use dbus::message::MatchRule;
use tauri::{AppHandle, Emitter, Manager, Runtime, Theme};

const PORTAL_SERVICE: &str = "org.freedesktop.portal.Desktop";
const PORTAL_PATH: &str = "/org/freedesktop/portal/desktop";
const PORTAL_SETTINGS: &str = "org.freedesktop.portal.Settings";
const APPEARANCE: &str = "org.freedesktop.appearance";
const COLOR_SCHEME: &str = "color-scheme";

#[derive(Default)]
pub struct SystemTheme(Mutex<Option<Theme>>);

impl SystemTheme {
    pub fn get(&self) -> Option<Theme> {
        *self.0.lock().unwrap()
    }

    fn set(&self, theme: Theme) {
        *self.0.lock().unwrap() = Some(theme);
    }
}

fn get_theme(color_scheme: u32) -> Theme {
    match color_scheme {
        1 => Theme::Dark,
        _ => Theme::Light,
    }
}

pub fn init<R: Runtime>(app: &AppHandle<R>) {
    app.manage(SystemTheme::default());

    let Ok(connection) = Connection::new_session() else {
        return;
    };

    let handle = app.clone();
    let rule = MatchRule::new_signal(PORTAL_SETTINGS, "SettingChanged")
        .with_sender(PORTAL_SERVICE)
        .with_path(PORTAL_PATH);

    if connection
        .add_match(
            rule,
            move |(namespace, key, value): (String, String, Variant<u32>), _, _| {
                if namespace == APPEARANCE && key == COLOR_SCHEME {
                    let theme = get_theme(value.0);
                    handle.state::<SystemTheme>().set(theme);
                    let _ = handle.emit("system-theme-changed", theme);
                }

                true
            },
        )
        .is_err()
    {
        return;
    }

    let proxy = connection.with_proxy(PORTAL_SERVICE, PORTAL_PATH, Duration::from_secs(1));
    let result: Result<(Variant<Variant<u32>>,), _> =
        proxy.method_call(PORTAL_SETTINGS, "Read", (APPEARANCE, COLOR_SCHEME));

    if let Ok((value,)) = result {
        app.state::<SystemTheme>().set(get_theme(value.0 .0));
    }

    std::thread::spawn(move || loop {
        if connection.process(Duration::from_secs(1)).is_err() {
            break;
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_theme() {
        assert_eq!(get_theme(0), Theme::Light);
        assert_eq!(get_theme(1), Theme::Dark);
        assert_eq!(get_theme(2), Theme::Light);
        assert_eq!(get_theme(3), Theme::Light);
    }

    #[test]
    fn test_system_theme() {
        let state = SystemTheme::default();

        assert_eq!(state.get(), None);

        state.set(Theme::Dark);
        assert_eq!(state.get(), Some(Theme::Dark));

        state.set(Theme::Light);
        assert_eq!(state.get(), Some(Theme::Light));
    }
}
