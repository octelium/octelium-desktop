import ErrorBanner from "@/components/ErrorBanner";
import { authenticateBrowser } from "@/features/daemon/actions";
import { useDomainState, useSelectDomain } from "@/features/daemon/hooks";
import {
  AuthenticationStatus_State,
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
