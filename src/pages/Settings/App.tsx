import { setPrefs } from "@/features/prefs/slice";
import { useAppDispatch, useAppSelector } from "@/utils/hooks";
import { isNative } from "@/utils/native";
import type { Prefs, ThemeMode } from "@/utils/prefs";
import { Alert, Select, Switch } from "@mantine/core";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import {
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";
import { useEffect, useState } from "react";

const THEMES = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const Row = (props: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) => (
  <div className="flex flex-col gap-3 border-b border-line py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <div className="text-sm font-bold text-strong">{props.title}</div>
      {props.description && (
        <div className="mt-0.5 text-sm font-medium text-muted">
          {props.description}
        </div>
      )}
    </div>
    <div className="flex-none">{props.children}</div>
  </div>
);

const AppSettings = () => {
  const dispatch = useAppDispatch();
  const prefs = useAppSelector((state) => state.prefs.prefs);
  const prefsError = useAppSelector((state) => state.prefs.error);
  const [error, setError] = useState<string | undefined>(undefined);

  const set = (arg: Partial<Prefs>) => {
    dispatch(setPrefs({ prefs: { ...prefs, ...arg } }));
  };

  useEffect(() => {
    if (!isNative()) {
      return;
    }

    void isEnabled()
      .then((ret) => {
        if (ret !== prefs.launchAtLogin) {
          dispatch(setPrefs({ prefs: { ...prefs, launchAtLogin: ret } }));
        }
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : String(err)),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLaunchAtLogin = async (value: boolean) => {
    set({ launchAtLogin: value });

    if (!isNative()) {
      return;
    }

    try {
      setError(undefined);
      await (value ? enable() : disable());
    } catch (err) {
      set({ launchAtLogin: !value });
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const setNotifications = async (value: boolean) => {
    if (!value || !isNative()) {
      set({ notifications: value });
      return;
    }

    try {
      setError(undefined);
      let granted = await isPermissionGranted();
      if (!granted) {
        granted = (await requestPermission()) === "granted";
      }
      if (!granted) {
        setError("Desktop notification permission was not granted.");
        return;
      }
      set({ notifications: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="rounded-xl border border-line bg-surface p-6 shadow-xs">
      <h2 className="text-sm font-extrabold tracking-tight text-strong">
        Application preferences
      </h2>
      <p className="mt-1 text-sm font-medium text-muted">
        These preferences belong to this desktop application. They never affect
        the Octelium daemon nor your Cluster Sessions.
      </p>

      {(error || prefsError) && (
        <Alert color="red" radius="md" className="mt-4" title="Could not apply">
          {error ?? prefsError}
        </Alert>
      )}

      <div className="mt-3">
        <Row title="Theme">
          <Select
            aria-label="Theme"
            className="w-[150px]"
            data={THEMES}
            allowDeselect={false}
            value={prefs.theme}
            onChange={(value) => set({ theme: (value ?? "system") as ThemeMode })}
          />
        </Row>

        <Row
          title="Launch at login"
          description="Start the Octelium application when you sign in to this machine."
        >
          <Switch
            aria-label="Launch at login"
            checked={prefs.launchAtLogin}
            onChange={(event) =>
              void setLaunchAtLogin(event.currentTarget.checked)
            }
          />
        </Row>

        <Row
          title="Start minimized"
          description="Keep the window hidden in the system tray at startup."
        >
          <Switch
            aria-label="Start minimized"
            disabled={!prefs.closeToTray}
            checked={prefs.startMinimized}
            onChange={(event) =>
              set({ startMinimized: event.currentTarget.checked })
            }
          />
        </Row>

        <Row
          title="Close to the tray"
          description="Closing the window hides it instead of quitting. Your Connections keep running either way."
        >
          <Switch
            aria-label="Close to the tray"
            checked={prefs.closeToTray}
            onChange={(event) => {
              const value = event.currentTarget.checked;
              set({
                closeToTray: value,
                startMinimized: value ? prefs.startMinimized : false,
              });
            }}
          />
        </Row>

        <Row
          title="Notifications"
          description="Show a desktop notification whenever a Connection is established or lost."
        >
          <Switch
            aria-label="Notifications"
            checked={prefs.notifications}
            onChange={(event) =>
              void setNotifications(event.currentTarget.checked)
            }
          />
        </Row>

        <Row
          title="Multiple Clusters"
          description="Show every configured domain in the Cluster switcher. Most people only need one domain."
        >
          <Switch
            aria-label="Multiple Clusters"
            checked={prefs.multiCluster}
            onChange={(event) =>
              set({ multiCluster: event.currentTarget.checked })
            }
          />
        </Row>
      </div>
    </div>
  );
};

export default AppSettings;
