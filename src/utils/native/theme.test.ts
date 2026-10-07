import { isNative } from "@/utils/native";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow, type Theme } from "@tauri-apps/api/window";
import { platform } from "@tauri-apps/plugin-os";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { setNativeTheme, watchSystemTheme } from "./theme";

vi.mock("@/utils/native", () => ({ isNative: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn() }));
vi.mock("@tauri-apps/api/window", () => ({ getCurrentWindow: vi.fn() }));
vi.mock("@tauri-apps/plugin-os", () => ({ platform: vi.fn() }));

const setTheme = vi.fn();
const unlisten = vi.fn();
const media = {
  matches: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

const changeMedia = (prefersDark: boolean) => {
  media.matches = prefersDark;
  media.addEventListener.mock.calls[0][1]();
};

const changeSystemTheme = (theme: Theme) => {
  vi.mocked(listen).mock.calls[0][1]({
    event: "system-theme-changed",
    id: 1,
    payload: theme,
  });
};

beforeEach(() => {
  vi.resetAllMocks();
  media.matches = false;
  vi.mocked(isNative).mockReturnValue(true);
  vi.mocked(platform).mockReturnValue("linux");
  vi.mocked(getCurrentWindow).mockReturnValue({ setTheme } as never);
  vi.mocked(listen).mockResolvedValue(unlisten);
  vi.mocked(invoke).mockResolvedValue("dark");
  setTheme.mockResolvedValue(undefined);
  vi.stubGlobal("window", { matchMedia: vi.fn(() => media) });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("setNativeTheme applies the resolved Linux theme", async () => {
  await setNativeTheme("system", true);
  expect(setTheme).toHaveBeenLastCalledWith("dark");

  await setNativeTheme("system", false);
  expect(setTheme).toHaveBeenLastCalledWith("light");

  await setNativeTheme("light", true);
  expect(setTheme).toHaveBeenLastCalledWith("light");

  await setNativeTheme("dark", false);
  expect(setTheme).toHaveBeenLastCalledWith("dark");
});

test.each(["windows", "macos"] as const)(
  "setNativeTheme restores system appearance on %s",
  async (value) => {
    vi.mocked(platform).mockReturnValue(value);

    await setNativeTheme("dark", false);
    expect(setTheme).toHaveBeenLastCalledWith("dark");

    await setNativeTheme("system", false);
    expect(setTheme).toHaveBeenLastCalledWith(null);

    await setNativeTheme("light", true);
    expect(setTheme).toHaveBeenLastCalledWith("light");
  },
);

test("setNativeTheme skips browser previews", async () => {
  vi.mocked(isNative).mockReturnValue(false);

  await setNativeTheme("dark", false);

  expect(getCurrentWindow).not.toHaveBeenCalled();
  expect(platform).not.toHaveBeenCalled();
});

test("watchSystemTheme uses Linux portal appearance independently of GTK", async () => {
  const onChange = vi.fn();
  const stop = watchSystemTheme(onChange);

  await vi.waitFor(() => expect(onChange).toHaveBeenLastCalledWith(true));

  onChange.mockClear();
  changeMedia(true);
  changeMedia(false);
  expect(onChange).not.toHaveBeenCalled();

  changeSystemTheme("light");
  expect(onChange).toHaveBeenLastCalledWith(false);

  changeSystemTheme("dark");
  expect(onChange).toHaveBeenLastCalledWith(true);

  stop();
  expect(unlisten).toHaveBeenCalledOnce();
  expect(media.removeEventListener).toHaveBeenCalledWith(
    "change",
    media.addEventListener.mock.calls[0][1],
  );

  onChange.mockClear();
  changeSystemTheme("light");
  changeMedia(false);
  expect(onChange).not.toHaveBeenCalled();
});

test("watchSystemTheme keeps newer portal events during the initial read", async () => {
  let resolve: (theme: Theme) => void = () => {};
  vi.mocked(invoke).mockReturnValue(
    new Promise<Theme>((ret) => {
      resolve = ret;
    }),
  );
  const onChange = vi.fn();
  const stop = watchSystemTheme(onChange);

  await vi.waitFor(() => expect(invoke).toHaveBeenCalled());
  changeSystemTheme("dark");
  resolve("light");
  await Promise.resolve();

  expect(onChange).toHaveBeenLastCalledWith(true);
  stop();
});

test.each([null, "unavailable"])(
  "watchSystemTheme falls back to media when the portal returns %s",
  async (value) => {
    if (value === null) {
      vi.mocked(invoke).mockResolvedValue(null);
    } else {
      vi.mocked(invoke).mockRejectedValue(new Error(value));
    }
    const onChange = vi.fn();
    const stop = watchSystemTheme(onChange);

    await vi.waitFor(() => expect(invoke).toHaveBeenCalled());
    changeMedia(true);
    expect(onChange).toHaveBeenLastCalledWith(true);

    changeMedia(false);
    expect(onChange).toHaveBeenLastCalledWith(false);
    stop();
  },
);

test("watchSystemTheme falls back when event registration fails", async () => {
  vi.mocked(listen).mockRejectedValue(new Error("unavailable"));
  const onChange = vi.fn();
  const stop = watchSystemTheme(onChange);

  await Promise.resolve();
  changeMedia(true);

  expect(onChange).toHaveBeenLastCalledWith(true);
  expect(invoke).not.toHaveBeenCalled();
  stop();
});

test("watchSystemTheme cleans up a pending event registration", async () => {
  let resolve: (stop: () => void) => void = () => {};
  vi.mocked(listen).mockReturnValue(
    new Promise<() => void>((ret) => {
      resolve = ret;
    }),
  );
  const stop = watchSystemTheme(vi.fn());

  stop();
  resolve(unlisten);
  await vi.waitFor(() => expect(unlisten).toHaveBeenCalledOnce());

  expect(invoke).not.toHaveBeenCalled();
});

test("watchSystemTheme ignores a pending read after cleanup", async () => {
  let resolve: (theme: Theme) => void = () => {};
  vi.mocked(invoke).mockReturnValue(
    new Promise<Theme>((ret) => {
      resolve = ret;
    }),
  );
  const onChange = vi.fn();
  const stop = watchSystemTheme(onChange);

  await vi.waitFor(() => expect(invoke).toHaveBeenCalled());
  stop();
  onChange.mockClear();
  resolve("dark");
  await Promise.resolve();

  expect(onChange).not.toHaveBeenCalled();
  expect(unlisten).toHaveBeenCalledOnce();
});

test("watchSystemTheme uses media in browser previews", () => {
  vi.mocked(isNative).mockReturnValue(false);
  const onChange = vi.fn();
  const stop = watchSystemTheme(onChange);

  expect(onChange).toHaveBeenLastCalledWith(false);
  changeMedia(true);
  expect(onChange).toHaveBeenLastCalledWith(true);

  expect(listen).not.toHaveBeenCalled();
  expect(invoke).not.toHaveBeenCalled();
  stop();
});

test.each(["windows", "macos"] as const)(
  "watchSystemTheme uses media on %s",
  (value) => {
    vi.mocked(platform).mockReturnValue(value);
    const onChange = vi.fn();
    const stop = watchSystemTheme(onChange);

    changeMedia(true);
    expect(onChange).toHaveBeenLastCalledWith(true);
    expect(listen).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
    stop();
  },
);
