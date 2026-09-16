import { expect, test } from "vitest";

import {
  AuthenticationStatus_State,
  ConnectionOptions_DNS_Mode,
  ConnectionOptions_ImplementationMode,
  ConnectionOptions_TunnelMode,
  ConnectionStatus_State,
  Error_Code,
  Operation_State,
  Operation_Type,
  type DomainState,
  type GetStatusResponse,
} from "@/gen/client/daemonv1";

import {
  canConnect,
  canDisconnect,
  getConnectionStateLabel,
  getDNSModeLabel,
  getDomainState,
  getErrorTitle,
  getImplementationModeLabel,
  getPendingOpenURL,
  getTunnelModeLabel,
  isAuthenticated,
  isConnected,
  isConnectionBusy,
  isErrorRetryable,
  isOperationActive,
  isTeardownOperation,
  normalizeDomain,
  selectDomain,
  validateDomain,
} from ".";

const getDomain = (arg: Partial<DomainState>): DomainState =>
  ({
    domain: "example.com",
    ...arg,
  }) as DomainState;

const getStatus = (domains: DomainState[]): GetStatusResponse =>
  ({
    instanceID: "instance",
    revision: 1,
    domains,
  }) as GetStatusResponse;

test("isOperationActive", () => {
  {
    expect(isOperationActive(undefined)).toBe(false);
  }
  {
    expect(
      isOperationActive({ state: Operation_State.RUNNING } as never),
    ).toBe(true);
  }
  {
    expect(
      isOperationActive({ state: Operation_State.WAITING_FOR_USER } as never),
    ).toBe(true);
  }
  {
    expect(
      isOperationActive({ state: Operation_State.SUCCEEDED } as never),
    ).toBe(false);
  }
  {
    expect(isOperationActive({ state: Operation_State.FAILED } as never)).toBe(
      false,
    );
  }
});

test("getPendingOpenURL", () => {
  {
    const ret = getPendingOpenURL(
      getDomain({
        lastOperation: {
          id: "op",
          domain: "example.com",
          type: Operation_Type.AUTHENTICATE,
          state: Operation_State.WAITING_FOR_USER,
          action: {
            type: {
              oneofKind: "openURL",
              openURL: { url: "https://example.com/login" },
            },
          },
        } as never,
      }),
    );
    expect(ret).toEqual("https://example.com/login");
  }
  {
    const ret = getPendingOpenURL(
      getDomain({
        lastOperation: {
          id: "op",
          domain: "example.com",
          type: Operation_Type.AUTHENTICATE,
          state: Operation_State.RUNNING,
        } as never,
      }),
    );
    expect(ret).toBeUndefined();
  }
  {
    expect(getPendingOpenURL(undefined)).toBeUndefined();
  }
});

test("canConnect", () => {
  {
    const ret = canConnect(
      getDomain({
        authentication: { state: AuthenticationStatus_State.AUTHENTICATED } as never,
        connection: { state: ConnectionStatus_State.DISCONNECTED } as never,
      }),
    );
    expect(ret).toBe(true);
  }
  {
    const ret = canConnect(
      getDomain({
        authentication: { state: AuthenticationStatus_State.LOGGED_OUT } as never,
        connection: { state: ConnectionStatus_State.DISCONNECTED } as never,
      }),
    );
    expect(ret).toBe(false);
  }
  {
    const ret = canConnect(
      getDomain({
        authentication: { state: AuthenticationStatus_State.AUTHENTICATED } as never,
        connection: { state: ConnectionStatus_State.CONNECTED } as never,
      }),
    );
    expect(ret).toBe(false);
  }
  {
    const ret = canConnect(
      getDomain({
        authentication: { state: AuthenticationStatus_State.AUTHENTICATED } as never,
        connection: { state: ConnectionStatus_State.DISCONNECTED } as never,
        lastOperation: { state: Operation_State.RUNNING } as never,
      }),
    );
    expect(ret).toBe(false);
  }
});

test("canDisconnect", () => {
  {
    const ret = canDisconnect(
      getDomain({
        connection: { state: ConnectionStatus_State.CONNECTED } as never,
      }),
    );
    expect(ret).toBe(true);
  }
  {
    const ret = canDisconnect(
      getDomain({
        connection: { state: ConnectionStatus_State.RECONNECTING } as never,
      }),
    );
    expect(ret).toBe(true);
  }
  {
    const ret = canDisconnect(
      getDomain({
        connection: { state: ConnectionStatus_State.CONNECTING } as never,
        lastOperation: {
          type: Operation_Type.CONNECT,
          state: Operation_State.RUNNING,
        } as never,
      }),
    );
    expect(ret).toBe(true);
  }
  {
    const ret = canDisconnect(
      getDomain({
        connection: { state: ConnectionStatus_State.DISCONNECTED } as never,
        lastOperation: {
          type: Operation_Type.AUTHENTICATE,
          state: Operation_State.WAITING_FOR_USER,
        } as never,
      }),
    );
    expect(ret).toBe(true);
  }
  {
    const ret = canDisconnect(
      getDomain({
        connection: { state: ConnectionStatus_State.DISCONNECTING } as never,
        lastOperation: {
          type: Operation_Type.DISCONNECT,
          state: Operation_State.RUNNING,
        } as never,
      }),
    );
    expect(ret).toBe(false);
  }
  {
    const ret = canDisconnect(
      getDomain({
        connection: { state: ConnectionStatus_State.DISCONNECTED } as never,
      }),
    );
    expect(ret).toBe(false);
  }
});

test("isTeardownOperation", () => {
  {
    const ret = isTeardownOperation({ type: Operation_Type.LOGOUT } as never);
    expect(ret).toBe(true);
  }
  {
    const ret = isTeardownOperation({ type: Operation_Type.DELETE } as never);
    expect(ret).toBe(true);
  }
  {
    const ret = isTeardownOperation({ type: Operation_Type.CONNECT } as never);
    expect(ret).toBe(false);
  }
  {
    expect(isTeardownOperation(undefined)).toBe(false);
  }
});

test("isConnectionBusy", () => {
  {
    const ret = isConnectionBusy(
      getDomain({
        connection: { state: ConnectionStatus_State.CONNECTING } as never,
      }),
    );
    expect(ret).toBe(true);
  }
  {
    const ret = isConnectionBusy(
      getDomain({
        connection: { state: ConnectionStatus_State.CONNECTED } as never,
      }),
    );
    expect(ret).toBe(false);
  }
});

test("selectDomain", () => {
  const connected = getDomain({
    domain: "connected.example.com",
    authentication: { state: AuthenticationStatus_State.AUTHENTICATED } as never,
    connection: { state: ConnectionStatus_State.CONNECTED } as never,
  });

  const authenticated = getDomain({
    domain: "authenticated.example.com",
    authentication: { state: AuthenticationStatus_State.AUTHENTICATED } as never,
    connection: { state: ConnectionStatus_State.DISCONNECTED } as never,
  });

  const loggedOut = getDomain({
    domain: "loggedout.example.com",
    authentication: { state: AuthenticationStatus_State.LOGGED_OUT } as never,
    connection: { state: ConnectionStatus_State.DISCONNECTED } as never,
  });

  {
    expect(selectDomain(getStatus([]), "example.com")).toBeUndefined();
  }
  {
    const ret = selectDomain(
      getStatus([loggedOut, connected, authenticated]),
      "authenticated.example.com",
    );
    expect(ret).toEqual("authenticated.example.com");
  }
  {
    const ret = selectDomain(getStatus([loggedOut, connected, authenticated]), "gone.example.com");
    expect(ret).toEqual("connected.example.com");
  }
  {
    const ret = selectDomain(getStatus([loggedOut, authenticated]), undefined);
    expect(ret).toEqual("authenticated.example.com");
  }
  {
    const ret = selectDomain(getStatus([loggedOut]), undefined);
    expect(ret).toEqual("loggedout.example.com");
  }
});

test("getDomainState", () => {
  const itm = getDomain({ domain: "example.com" });

  {
    expect(getDomainState(getStatus([itm]), "example.com")).toEqual(itm);
  }
  {
    expect(getDomainState(getStatus([itm]), "other.example.com")).toBeUndefined();
  }
  {
    expect(getDomainState(undefined, "example.com")).toBeUndefined();
  }
});

test("validateDomain", () => {
  {
    expect(validateDomain("example.com")).toBeUndefined();
  }
  {
    expect(validateDomain("sub.example.com")).toBeUndefined();
  }
  {
    expect(validateDomain("")).toEqual("The Cluster domain is required");
  }
  {
    expect(validateDomain("example")).toEqual("Invalid Cluster domain");
  }
  {
    expect(validateDomain("-example.com")).toEqual("Invalid Cluster domain");
  }
  {
    expect(validateDomain("exa mple.com")).toEqual("Invalid Cluster domain");
  }
  {
    expect(validateDomain(`${"a".repeat(256)}.com`)).toEqual(
      "The Cluster domain is too long",
    );
  }
  {
    expect(validateDomain(`${"a".repeat(64)}.com`)).toEqual(
      "A Cluster domain label is too long",
    );
  }
  {
    expect(validateDomain(`${"a".repeat(63)}.com`)).toBeUndefined();
  }
});

test("normalizeDomain", () => {
  {
    expect(normalizeDomain("  Example.COM  ")).toEqual("example.com");
  }
  {
    expect(normalizeDomain("https://example.com/portal")).toEqual("example.com");
  }
  {
    expect(normalizeDomain("https://example.com?a=b")).toEqual("example.com");
  }
  {
    expect(normalizeDomain("user@example.com")).toEqual("example.com");
  }
  {
    expect(normalizeDomain("example.com.")).toEqual("example.com");
  }
  {
    expect(normalizeDomain("https://Bücher.example/path")).toEqual(
      "xn--bcher-kva.example",
    );
  }
});

test("isAuthenticated", () => {
  {
    const ret = isAuthenticated(
      getDomain({
        authentication: { state: AuthenticationStatus_State.AUTHENTICATED } as never,
      }),
    );
    expect(ret).toBe(true);
  }
  {
    const ret = isAuthenticated(
      getDomain({
        authentication: { state: AuthenticationStatus_State.AUTHENTICATING } as never,
      }),
    );
    expect(ret).toBe(false);
  }
});

test("isConnected", () => {
  {
    const ret = isConnected(
      getDomain({ connection: { state: ConnectionStatus_State.CONNECTED } as never }),
    );
    expect(ret).toBe(true);
  }
  {
    expect(isConnected(undefined)).toBe(false);
  }
});

test("getConnectionStateLabel", () => {
  {
    expect(getConnectionStateLabel(ConnectionStatus_State.CONNECTED)).toEqual(
      "Connected",
    );
  }
  {
    expect(getConnectionStateLabel(ConnectionStatus_State.RECONNECTING)).toEqual(
      "Reconnecting",
    );
  }
  {
    expect(getConnectionStateLabel(undefined)).toEqual("Disconnected");
  }
});

test("getTunnelModeLabel", () => {
  {
    expect(getTunnelModeLabel(ConnectionOptions_TunnelMode.WIREGUARD)).toEqual(
      "WireGuard",
    );
  }
  {
    expect(getTunnelModeLabel(ConnectionOptions_TunnelMode.QUICV0)).toEqual("QUIC");
  }
  {
    expect(getTunnelModeLabel(undefined)).toEqual("Automatic");
  }
});

test("getImplementationModeLabel", () => {
  {
    const ret = getImplementationModeLabel(
      ConnectionOptions_ImplementationMode.GVISOR,
    );
    expect(ret).toEqual("gVisor");
  }
  {
    expect(getImplementationModeLabel(undefined)).toEqual("Automatic");
  }
});

test("getDNSModeLabel", () => {
  {
    expect(getDNSModeLabel(ConnectionOptions_DNS_Mode.FULL)).toEqual("Full");
  }
  {
    expect(getDNSModeLabel(ConnectionOptions_DNS_Mode.DISABLED)).toEqual("Disabled");
  }
  {
    expect(getDNSModeLabel(undefined)).toEqual("Split");
  }
});

test("getErrorTitle", () => {
  {
    const ret = getErrorTitle({
      code: Error_Code.CLUSTER_UNREACHABLE,
      message: "",
      retryable: true,
    });
    expect(ret).toEqual("Cluster unreachable");
  }
  {
    expect(getErrorTitle(undefined)).toEqual("Something went wrong");
  }
});

test("isErrorRetryable", () => {
  {
    const ret = isErrorRetryable({
      code: Error_Code.CLUSTER_UNREACHABLE,
      message: "",
      retryable: true,
    });
    expect(ret).toBe(true);
  }
  {
    const ret = isErrorRetryable({
      code: Error_Code.OPERATION_CANCELED,
      message: "",
      retryable: true,
    });
    expect(ret).toBe(false);
  }
  {
    expect(isErrorRetryable(undefined)).toBe(false);
  }
});
