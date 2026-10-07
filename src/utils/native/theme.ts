import { isNative } from "@/utils/native";
import { resolveTheme, type ThemeMode } from "@/utils/prefs";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow, type Theme } from "@tauri-apps/api/window";
import { platform } from "@tauri-apps/plugin-os";

export const setNativeTheme = async (
  theme: ThemeMode,
  prefersDark: boolean,
): Promise<void> => {
  if (!isNative()) {
    return;
  }

  await getCurrentWindow().setTheme(
    platform() === "linux"
      ? resolveTheme(theme, prefersDark)
      : theme === "system"
        ? null
        : theme,
  );
};

export const watchSystemTheme = (
  onChange: (prefersDark: boolean) => void,
): UnlistenFn => {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  let active = true;
  let nativeTheme = false;
  let unlisten: UnlistenFn | undefined;

  const onMediaChange = () => {
    if (active && !nativeTheme) {
      onChange(media.matches);
    }
  };

  onMediaChange();
  media.addEventListener("change", onMediaChange);

  if (isNative() && platform() === "linux") {
    void listen<Theme>("system-theme-changed", (event) => {
      if (active) {
        nativeTheme = true;
        onChange(event.payload === "dark");
      }
    })
      .then(async (stop) => {
        if (!active) {
          stop();
          return;
        }

        unlisten = stop;

        const theme = await invoke<Theme | null>("get_system_theme");
        if (active && !nativeTheme && theme) {
          nativeTheme = true;
          onChange(theme === "dark");
        }
      })
      .catch(() => {});
  }

  return () => {
    active = false;
    media.removeEventListener("change", onMediaChange);
    unlisten?.();
  };
};
