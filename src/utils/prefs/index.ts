import { isNative } from "@/utils/native";
import { load, type Store } from "@tauri-apps/plugin-store";

export type ThemeMode = "system" | "light" | "dark";

export type Prefs = {
  theme: ThemeMode;
  primaryDomain?: string;
  multiCluster: boolean;
  launchAtLogin: boolean;
  startMinimized: boolean;
  closeToTray: boolean;
  notifications: boolean;
  itemsPerPage: number;
};

const STORE_FILE = "prefs.json";
const STORE_KEY = "prefs";

export const defaultPrefs: Prefs = {
  theme: "system",
  multiCluster: false,
  launchAtLogin: false,
  startMinimized: false,
  closeToTray: false,
  notifications: false,
  itemsPerPage: 10,
};

export const normalizePrefs = (arg?: Partial<Prefs> | null): Prefs => {
  const legacy = arg as (Partial<Prefs> & { lastDomain?: string }) | undefined;
  const ret: Prefs & { lastDomain?: string } = {
    ...defaultPrefs,
    ...(arg ?? {}),
    primaryDomain: arg?.primaryDomain || legacy?.lastDomain || undefined,
  };

  delete ret.lastDomain;

  if (!["system", "light", "dark"].includes(ret.theme)) {
    ret.theme = defaultPrefs.theme;
  }

  if (![10, 25, 50, 100].includes(ret.itemsPerPage)) {
    ret.itemsPerPage = defaultPrefs.itemsPerPage;
  }

  for (const key of [
    "multiCluster",
    "launchAtLogin",
    "startMinimized",
    "closeToTray",
    "notifications",
  ] as const) {
    if (typeof ret[key] !== "boolean") {
      ret[key] = defaultPrefs[key];
    }
  }

  if (typeof ret.primaryDomain !== "string" || ret.primaryDomain.trim() === "") {
    ret.primaryDomain = undefined;
  } else {
    ret.primaryDomain = ret.primaryDomain.trim().toLowerCase();
  }

  return ret;
};

let store: Store | undefined;

const getStore = async (): Promise<Store | undefined> => {
  if (!isNative()) {
    return undefined;
  }

  if (!store) {
    store = await load(STORE_FILE, { defaults: {}, autoSave: 200 });
  }

  return store;
};

export const loadPrefs = async (): Promise<Prefs> => {
  const c = await getStore();
  if (!c) {
    return defaultPrefs;
  }

  return normalizePrefs(await c.get<Partial<Prefs>>(STORE_KEY));
};

export const savePrefs = async (arg: Prefs): Promise<void> => {
  const c = await getStore();
  if (!c) {
    return;
  }

  await c.set(STORE_KEY, arg);
  await c.save();
};

export const resolveTheme = (
  arg: ThemeMode,
  prefersDark: boolean,
): "light" | "dark" => {
  switch (arg) {
    case "light":
      return "light";
    case "dark":
      return "dark";
    default:
      return prefersDark ? "dark" : "light";
  }
};
