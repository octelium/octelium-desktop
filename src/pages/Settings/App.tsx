import { SectionCard } from "@/components/Card";
import ExternalLink from "@/components/ExternalLink";
import Label from "@/components/Label";
import Notice from "@/components/Notice";
import SettingRow from "@/components/SettingRow";
import { setPrefs } from "@/features/prefs/slice";
import { useAppDispatch, useAppSelector } from "@/utils/hooks";
import { isNative } from "@/utils/native";
import type { Prefs, ThemeMode } from "@/utils/prefs";
import {
  currentAppVersion,
  getLatestAppVersion,
  isNewerVersion,
  RELEASES_PAGE_URL,
} from "@/utils/version";
import { SegmentedControl, Switch } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import {
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";
import {
  AlertTriangle,
  AppWindow,
  ArrowUpRight,
  Bell,
  Info,
  Layers,
  Monitor,
  Moon,
  Sun,
  SunMoon,
} from "lucide-react";
import { useEffect, useState } from "react";

const THEMES = [
  {
    value: "system",
    label: (
      <span className="flex items-center justify-center gap-1.5">
        <Monitor size={13} aria-hidden />
        System
      </span>
    ),
  },
  {
    value: "light",
    label: (
      <span className="flex items-center justify-center gap-1.5">
        <Sun size={13} aria-hidden />
        Light
      </span>
    ),
  },
  {
    value: "dark",
    label: (
      <span className="flex items-center justify-center gap-1.5">
        <Moon size={13} aria-hidden />
        Dark
      </span>
    ),
  },
];

const AppSettings = () => {
  const dispatch = useAppDispatch();
  const prefs = useAppSelector((state) => state.prefs.prefs);
  const prefsError = useAppSelector((state) => state.prefs.error);
  const [error, setError] = useState<string | undefined>(undefined);
  const latestVersionQuery = useQuery({
    queryKey: ["github", "octelium-desktop", "latest-release"],
    queryFn: getLatestAppVersion,
    staleTime: 6 * 60 * 60 * 1000,
    retry: false,
  });
  const updateAvailable = isNewerVersion(
    latestVersionQuery.data,
    currentAppVersion,
  );

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
    <div className="flex flex-col gap-4">
      {(error || prefsError) && (
        <Notice
          tone="rose"
          icon={<AlertTriangle size={15} aria-hidden />}
          title="Could not apply"
        >
          {error ?? prefsError}
        </Notice>
      )}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <SectionCard
            title="Appearance"
            description="How this application looks on this device"
            icon={<SunMoon size={14} strokeWidth={2.25} />}
          >
            <SettingRow
              title="Theme"
              description="System follows your device."
            >
              <SegmentedControl
                aria-label="Theme"
                size="xs"
                data={THEMES}
                value={prefs.theme}
                onChange={(value) => set({ theme: value as ThemeMode })}
              />
            </SettingRow>
          </SectionCard>

          <SectionCard
            title="Startup and window"
            description="How the application starts and closes"
            icon={<AppWindow size={14} strokeWidth={2.25} />}
          >
            <SettingRow
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
            </SettingRow>

            <SettingRow
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
            </SettingRow>

            <SettingRow
              title="Start minimized"
              description={
                prefs.closeToTray
                  ? "Keep the window hidden in the system tray at startup."
                  : "Requires closing to the tray."
              }
            >
              <Switch
                aria-label="Start minimized"
                disabled={!prefs.closeToTray}
                checked={prefs.startMinimized}
                onChange={(event) =>
                  set({ startMinimized: event.currentTarget.checked })
                }
              />
            </SettingRow>
          </SectionCard>

        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <SectionCard
            title="Notifications"
            description="Desktop notifications of this application"
            icon={<Bell size={14} strokeWidth={2.25} />}
          >
            <SettingRow
              title="Connection notifications"
              description="Show a desktop notification whenever a Connection is established or lost."
            >
              <Switch
                aria-label="Connection notifications"
                checked={prefs.notifications}
                onChange={(event) =>
                  void setNotifications(event.currentTarget.checked)
                }
              />
            </SettingRow>
          </SectionCard>

          <SectionCard
            title="Clusters"
            description="How the Clusters of this device are presented"
            icon={<Layers size={14} strokeWidth={2.25} />}
          >
            <SettingRow
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
            </SettingRow>
          </SectionCard>

          <SectionCard
            title="About"
            description="Octelium is free and open source software"
            icon={<Info size={14} strokeWidth={2.25} />}
          >
            <SettingRow
              title="Current version"
              description={
                currentAppVersion
                  ? "The version installed on this device."
                  : "This build was not created from a release tag."
              }
            >
              <span className="font-mono text-xs font-medium text-strong" data-selectable>
                {currentAppVersion ?? "Development build"}
              </span>
            </SettingRow>

            {latestVersionQuery.data && (
              <SettingRow
                title="Latest release"
                description={
                  updateAvailable
                    ? "A newer release is available for download."
                    : "The latest published release reported by GitHub."
                }
              >
                <div className="flex items-center gap-2">
                  {updateAvailable && (
                    <Label tone="sky" dot>
                      Update available
                    </Label>
                  )}
                  <ExternalLink
                    href={RELEASES_PAGE_URL}
                    className="inline-flex items-center gap-1 rounded-md font-mono text-xs font-medium text-strong hover:underline"
                  >
                    {latestVersionQuery.data}
                    <ArrowUpRight size={12} aria-hidden />
                  </ExternalLink>
                </div>
              </SettingRow>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

export default AppSettings;
