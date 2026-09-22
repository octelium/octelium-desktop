import { invoke, isTauri } from "@tauri-apps/api/core";

export type AppInfo = {
  version: string;
  platform: string;
  arch: string;
  daemonAddress: string;
};

export type TrayDomain = {
  domain: string;
  connected: boolean;
  busy: boolean;
  authenticated: boolean;
};

export type TraySummary = {
  available: boolean;
  domains: TrayDomain[];
  dark: boolean;
};

export const isNative = (): boolean => isTauri();

export const getAppInfo = async (): Promise<AppInfo> =>
  invoke<AppInfo>("get_app_info");

export const openExternal = async (url: string): Promise<void> =>
  invoke("open_external", { url });

export const updateTray = async (summary: TraySummary): Promise<void> =>
  invoke("update_tray", { summary });

export const notify = async (title: string, body: string): Promise<void> =>
  invoke("notify", { title, body });

export const quitApp = async (): Promise<void> => invoke("quit_app");

export const showWindow = async (): Promise<void> => invoke("show_window");
