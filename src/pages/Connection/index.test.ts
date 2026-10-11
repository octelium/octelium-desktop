import ErrorBanner from "@/components/ErrorBanner";
import { authenticateBrowser } from "@/features/daemon/actions";
import { useDomainState, useSelectDomain } from "@/features/daemon/hooks";
import {
  AuthenticationStatus_State,
  ConnectionOptions_ImplementationMode,
  ConnectionOptions_L3Mode,
  ConnectionOptions_TunnelMode,
  ConnectionStatus_State,
  DomainState,
  Error_Code,
  Operation,
  Operation_State,
} from "@/gen/client/daemonv1";
import { useAppSelector } from "@/utils/hooks";
import { openExternal } from "@/utils/native";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, test, vi } from "vitest";

import Connection from ".";

vi.mock("@/components/ErrorBanner", () => ({ default: vi.fn(() => null) }));
vi.mock("@/features/daemon/hooks", () => ({
  useDomainState: vi.fn(),
  useSelectDomain: vi.fn(),
}));
vi.mock("@/utils/hooks", () => ({ useAppSelector: vi.fn() }));
vi.mock("@/utils/native", () => ({ openExternal: vi.fn() }));
vi.mock("@/features/daemon/actions", () => ({
  authenticateBrowser: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  getErrorMessage: vi.fn(),
}));

const render = () => renderToStaticMarkup(
  createElement(MantineProvider, null,
    createElement(QueryClientProvider, { client: new QueryClient() },
      createElement(Connection),
    ),
  ),
);

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useAppSelector).mockReturnValue("example.com");
  vi.mocked(useSelectDomain).mockReturnValue(vi.fn());
  vi.mocked(useDomainState).mockReturnValue(DomainState.create({
    domain: "example.com",
    authentication: { state: AuthenticationStatus_State.AUTHENTICATED },
    lastError: { code: Error_Code.AUTHENTICATION_REQUIRED },
  }));
  vi.mocked(authenticateBrowser).mockResolvedValue(Operation.create({
    domain: "example.com",
    state: Operation_State.WAITING_FOR_USER,
    action: {
      type: {
        oneofKind: "openURL",
        openURL: { url: "https://example.com/login" },
      },
    },
  }));
});

test("Connection offers browser sign in when the daemon still reports signed in", async () => {
  expect(render()).toContain("Signed in");
  const props = vi.mocked(ErrorBanner).mock.calls[0][0];
  expect(props.error?.code).toBe(Error_Code.AUTHENTICATION_REQUIRED);
  expect(props.disabled).toBe(false);

  props.onSignIn?.();

  await vi.waitFor(() => {
    expect(authenticateBrowser).toHaveBeenCalledWith("example.com");
    expect(openExternal).toHaveBeenCalledWith("https://example.com/login");
  });
});

test("Connection disables sign in during an active operation", () => {
  vi.mocked(useDomainState).mockReturnValue(DomainState.create({
    domain: "example.com",
    authentication: { state: AuthenticationStatus_State.AUTHENTICATED },
    lastError: { code: Error_Code.AUTHENTICATION_REQUIRED },
    lastOperation: { state: Operation_State.WAITING_FOR_USER },
  }));

  render();

  expect(vi.mocked(ErrorBanner).mock.calls[0][0].disabled).toBe(true);
});

test("Connection disables the sign-in form while browser authentication is pending", () => {
  vi.mocked(useDomainState).mockReturnValue(DomainState.create({
    domain: "example.com",
    authentication: { state: AuthenticationStatus_State.AUTHENTICATING },
    lastOperation: { state: Operation_State.WAITING_FOR_USER },
  }));

  expect(render()).toMatch(/<button[^>]*disabled[^>]*>[\s\S]*?Continue in browser/);
});

test.each([
  [ConnectionOptions_TunnelMode.QUICV0, ConnectionOptions_ImplementationMode.KERNEL, "TUN"],
  [ConnectionOptions_TunnelMode.QUICV0, ConnectionOptions_ImplementationMode.IMPLEMENTATION_MODE_UNSPECIFIED, "TUN"],
  [ConnectionOptions_TunnelMode.WIREGUARD, ConnectionOptions_ImplementationMode.IMPLEMENTATION_MODE_UNSPECIFIED, "Kernel"],
  [ConnectionOptions_TunnelMode.WIREGUARD, ConnectionOptions_ImplementationMode.TUN, "TUN"],
] as const)("Connection displays implementation for tunnel mode %s and implementation mode %s", (tunnelMode, implementationMode, label) => {
  vi.mocked(useDomainState).mockReturnValue(DomainState.create({
    domain: "example.com",
    authentication: { state: AuthenticationStatus_State.AUTHENTICATED },
    connection: {
      state: ConnectionStatus_State.CONNECTED,
      tunnelMode,
      implementationMode,
    },
  }));

  expect(render()).toMatch(new RegExp(`Implementation</dt><dd[^>]*>${label}</dd>`));
});

test.each([
  [ConnectionOptions_L3Mode.V4, true, false],
  [ConnectionOptions_L3Mode.V6, false, true],
  [ConnectionOptions_L3Mode.BOTH, true, true],
  [ConnectionOptions_L3Mode.L3_MODE_UNSPECIFIED, true, true],
  [undefined, true, true],
] as const)("Connection displays addresses for IP mode %s", (l3Mode, showIPv4, showIPv6) => {
  vi.mocked(useDomainState).mockReturnValue(DomainState.create({
    domain: "example.com",
    authentication: { state: AuthenticationStatus_State.AUTHENTICATED },
    connection: {
      state: ConnectionStatus_State.CONNECTED,
      options: l3Mode === undefined ? undefined : { l3Mode },
      addresses: [
        { v4: "100.64.0.1/32", v6: "fd00::1/128" },
        { v4: "100.64.0.2/32" },
        { v6: "fd00::2/128" },
        {},
      ],
    },
    settings: { connectionOptions: { l3Mode: ConnectionOptions_L3Mode.V4 } },
  }));

  const markup = render();
  for (const address of ["100.64.0.1/32", "100.64.0.2/32"]) {
    expect(markup.includes(address)).toBe(showIPv4);
  }
  for (const address of ["fd00::1/128", "fd00::2/128"]) {
    expect(markup.includes(address)).toBe(showIPv6);
  }
  expect(markup.match(/Addresses<\/dt>/g)).toHaveLength(showIPv4 && showIPv6 ? 3 : 2);
});
