use std::cell::RefCell;
use std::sync::Mutex;
use std::time::Duration;

use dbus::arg::Variant;
use dbus::blocking::Connection;
use dbus::message::MatchRule;
use gtk::prelude::*;
use tauri::{AppHandle, Emitter, Manager, Runtime, Theme};

thread_local! {
    static TITLEBAR_PROVIDER: RefCell<Option<gtk::CssProvider>> = const { RefCell::new(None) };
}

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

fn get_titlebar_css(background: &str, foreground: &str, muted: &str) -> String {
    format!(
        r#"headerbar.titlebar.default-decoration,
.titlebar.default-decoration {{
  background: {background};
  background-image: none;
  color: {foreground};
  border: none;
  box-shadow: none;
}}

headerbar.titlebar.default-decoration:backdrop,
.titlebar.default-decoration:backdrop {{
  background: {background};
  background-image: none;
  color: {muted};
}}

.titlebar.default-decoration button.titlebutton {{
  color: inherit;
  background: none;
  background-image: none;
  border: none;
  box-shadow: none;
  text-shadow: none;
  -gtk-icon-shadow: none;
}}

.titlebar.default-decoration button.titlebutton:hover {{
  background: alpha({foreground}, 0.1);
}}

.titlebar.default-decoration button.titlebutton:active {{
  background: alpha({foreground}, 0.18);
}}
"#
    )
}

pub fn set_titlebar<R: Runtime>(
    app: &AppHandle<R>,
    background: &str,
    foreground: &str,
    muted: &str,
) -> tauri::Result<()> {
    let css = get_titlebar_css(background, foreground, muted);

    app.run_on_main_thread(move || {
        TITLEBAR_PROVIDER.with(|cell| {
            let mut cell = cell.borrow_mut();
            let provider = cell.get_or_insert_with(|| {
                let provider = gtk::CssProvider::new();
                if let Some(screen) = gtk::gdk::Screen::default() {
                    gtk::StyleContext::add_provider_for_screen(
                        &screen,
                        &provider,
                        gtk::STYLE_PROVIDER_PRIORITY_APPLICATION,
                    );
                }
                provider
            });

            let _ = provider.load_from_data(css.as_bytes());
        });
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_titlebar_css() {
        let css = get_titlebar_css("#0c0c0e", "#ececef", "#99999c");

        assert!(css.contains("background: #0c0c0e;"));
        assert!(css.contains("color: #ececef;"));
        assert!(css.contains("color: #99999c;"));
        assert!(css.contains("alpha(#ececef, 0.1)"));
        assert_eq!(css.matches('{').count(), css.matches('}').count());
    }

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
