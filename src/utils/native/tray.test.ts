import {
  authenticateBrowser,
  connect,
  disconnect,
  logout,
} from "@/features/daemon/actions";
import {
  AuthenticationStatus_State,
  ConnectionStatus_State,
  DomainState,
  Error_Code,
  GetStatusResponse,
  Operation,
  Operation_State,
  Operation_Type,
} from "@/gen/client/daemonv1";
import { openExternal } from "@/utils/native";
import { beforeEach, expect, test, vi } from "vitest";

import { getTraySummary, handleTrayAction } from "./tray";

vi.mock("@/features/daemon/actions", () => ({
  authenticateBrowser: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  logout: vi.fn(),
}));
vi.mock("@/utils/native", () => ({ openExternal: vi.fn() }));

const handlers = {
  selected: "selected.example.com",
  selectDomain: vi.fn(),
  navigate: vi.fn(),
  onSignOut: vi.fn(),
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(authenticateBrowser).mockResolvedValue(Operation.create({
    domain: "canonical.example.com",
    state: Operation_State.WAITING_FOR_USER,
    action: {
      type: {
        oneofKind: "openURL",
        openURL: { url: "https://example.com/login" },
      },
    },
  }));
});

test("getTraySummary includes expired credentials for the selected Cluster", () => {
  const status = GetStatusResponse.create({
    domains: [
      DomainState.create({ domain: "other.example.com" }),
      DomainState.create({
        domain: "selected.example.com",
        authentication: { state: AuthenticationStatus_State.AUTHENTICATED },
        lastError: { code: Error_Code.AUTHENTICATION_REQUIRED },
      }),
    ],
  });

  expect(getTraySummary(true, false, status, handlers.selected)).toEqual({
    available: true,
    dark: false,
    domains: [{
      domain: "selected.example.com",
      connected: false,
      busy: false,
      authenticated: true,
      authenticationRequired: true,
      state: "Disconnected",
    }],
  });
});

test.each([
  Operation_State.PENDING,
  Operation_State.RUNNING,
  Operation_State.WAITING_FOR_USER,
])("getTraySummary marks authentication operation %s as busy", (state) => {
  const status = GetStatusResponse.create({
    domains: [DomainState.create({
      domain: "example.com",
      lastOperation: { state, type: Operation_Type.AUTHENTICATE },
    })],
  });

  expect(getTraySummary(true, false, status).domains[0]).toMatchObject({
    busy: true,
    state: "Signing in",
  });
});

test("getTraySummary preserves connection activity and missing Cluster selection", () => {
  const status = GetStatusResponse.create({
    domains: [DomainState.create({
      domain: "example.com",
      connection: { state: ConnectionStatus_State.RECONNECTING },
      lastOperation: { state: Operation_State.FAILED },
    })],
  });

  expect(getTraySummary(true, true, status).domains[0]).toMatchObject({
    busy: true,
    authenticationRequired: false,
    state: "Reconnecting",
  });
  expect(getTraySummary(true, false, status, handlers.selected).domains[0]).toMatchObject({
    domain: handlers.selected,
    busy: false,
    authenticated: false,
    authenticationRequired: false,
  });
  expect(getTraySummary(false, false).domains).toEqual([]);
});

test("tray sign in opens the browser for the event Cluster", async () => {
  await handleTrayAction({ action: "sign-in", domain: "example.com" }, handlers);

  expect(handlers.navigate).toHaveBeenCalledWith("/connection");
  expect(authenticateBrowser).toHaveBeenCalledWith("example.com");
  expect(handlers.selectDomain).toHaveBeenLastCalledWith("canonical.example.com");
  expect(openExternal).toHaveBeenCalledWith("https://example.com/login");
});

test("tray sign in uses the selected Cluster when no domain is supplied", async () => {
  await handleTrayAction({ action: "sign-in" }, handlers);

  expect(authenticateBrowser).toHaveBeenCalledWith(handlers.selected);
});

test("tray sign in opens the form before any Cluster is configured", async () => {
  await handleTrayAction({ action: "sign-in" }, { ...handlers, selected: undefined });

  expect(handlers.navigate).toHaveBeenCalledWith("/connection");
  expect(authenticateBrowser).not.toHaveBeenCalled();
  expect(openExternal).not.toHaveBeenCalled();
});

test("tray sign in only opens a pending browser action", async () => {
  vi.mocked(authenticateBrowser).mockResolvedValue(Operation.create({
    state: Operation_State.RUNNING,
    action: {
      type: {
        oneofKind: "openURL",
        openURL: { url: "https://example.com/login" },
      },
    },
  }));

  await handleTrayAction({ action: "sign-in" }, handlers);

  expect(handlers.selectDomain).toHaveBeenLastCalledWith(handlers.selected);
  expect(openExternal).not.toHaveBeenCalled();
});

test("tray sign in propagates request and browser failures", async () => {
  const error = new Error("Could not open the browser");
  vi.mocked(openExternal).mockRejectedValueOnce(error);
  await expect(handleTrayAction({ action: "sign-in" }, handlers)).rejects.toBe(error);

  vi.mocked(authenticateBrowser).mockRejectedValueOnce(error);
  await expect(handleTrayAction({ action: "sign-in" }, handlers)).rejects.toBe(error);
});

test("tray sign out requests confirmation for the event Cluster", async () => {
  await handleTrayAction({ action: "sign-out", domain: "example.com" }, handlers);

  expect(handlers.onSignOut).toHaveBeenCalledWith("example.com");
  expect(logout).not.toHaveBeenCalled();
});

test("tray connection and navigation actions keep their existing behavior", async () => {
  await handleTrayAction({ action: "connect" }, handlers);
  expect(connect).toHaveBeenCalledWith(handlers.selected);

  await handleTrayAction({ action: "disconnect", domain: "example.com" }, handlers);
  expect(disconnect).toHaveBeenCalledWith("example.com");

  await handleTrayAction({ action: "navigate", path: "/settings" }, handlers);
  expect(handlers.navigate).toHaveBeenLastCalledWith("/settings");
});
