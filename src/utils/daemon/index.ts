import {
  AuthenticationStatus_State,
  ConnectionOptions_DNS_Mode,
  ConnectionOptions_ImplementationMode,
  ConnectionOptions_L3Mode,
  ConnectionOptions_TunnelMode,
  ConnectionStatus_State,
  Error_Code,
  Operation_State,
  Operation_Type,
  type DomainState,
  type Error as DaemonError,
  type GetStatusResponse,
  type Operation,
} from "@/gen/client/daemonv1";
import type { LabelTone } from "@/components/Label";

export type ConnectivityTone = "connected" | "pending" | "idle" | "error";

export const isOperationActive = (arg?: Operation): boolean => {
  switch (arg?.state) {
    case Operation_State.PENDING:
    case Operation_State.RUNNING:
    case Operation_State.WAITING_FOR_USER:
      return true;
    default:
      return false;
  }
};

export const getActiveOperation = (arg?: DomainState): Operation | undefined =>
  isOperationActive(arg?.lastOperation) ? arg?.lastOperation : undefined;

export const getPendingOpenURL = (arg?: DomainState): string | undefined => {
  const op = getActiveOperation(arg);
  if (op?.state !== Operation_State.WAITING_FOR_USER) {
    return undefined;
  }

  return op.action?.type.oneofKind === "openURL"
    ? op.action.type.openURL.url
    : undefined;
};

export const isAuthenticated = (arg?: DomainState): boolean =>
  arg?.authentication?.state === AuthenticationStatus_State.AUTHENTICATED;

export const isConnected = (arg?: DomainState): boolean =>
  arg?.connection?.state === ConnectionStatus_State.CONNECTED;

export const isConnectionBusy = (arg?: DomainState): boolean => {
  switch (arg?.connection?.state) {
    case ConnectionStatus_State.CONNECTING:
    case ConnectionStatus_State.RECONNECTING:
    case ConnectionStatus_State.DISCONNECTING:
      return true;
    default:
      return false;
  }
};

export const canConnect = (arg?: DomainState): boolean =>
  isAuthenticated(arg) &&
  !isConnectionBusy(arg) &&
  !isConnected(arg) &&
  !isOperationActive(arg?.lastOperation);

export const isTeardownOperation = (arg?: Operation): boolean => {
  switch (arg?.type) {
    case Operation_Type.DISCONNECT:
    case Operation_Type.LOGOUT:
    case Operation_Type.DELETE:
      return true;
    default:
      return false;
  }
};

export const canDisconnect = (arg?: DomainState): boolean => {
  if (isOperationActive(arg?.lastOperation) && isTeardownOperation(arg?.lastOperation)) {
    return false;
  }

  switch (arg?.connection?.state) {
    case ConnectionStatus_State.CONNECTED:
    case ConnectionStatus_State.CONNECTING:
    case ConnectionStatus_State.RECONNECTING:
      return true;
    default:
      return isOperationActive(arg?.lastOperation);
  }
};

export const getConnectionStateLabel = (arg?: ConnectionStatus_State): string => {
  switch (arg) {
    case ConnectionStatus_State.CONNECTED:
      return "Connected";
    case ConnectionStatus_State.CONNECTING:
      return "Connecting";
    case ConnectionStatus_State.RECONNECTING:
      return "Reconnecting";
    case ConnectionStatus_State.DISCONNECTING:
      return "Disconnecting";
    default:
      return "Disconnected";
  }
};

export const getConnectionStateTone = (
  arg?: ConnectionStatus_State,
): ConnectivityTone => {
  switch (arg) {
    case ConnectionStatus_State.CONNECTED:
      return "connected";
    case ConnectionStatus_State.CONNECTING:
    case ConnectionStatus_State.RECONNECTING:
    case ConnectionStatus_State.DISCONNECTING:
      return "pending";
    default:
      return "idle";
  }
};

export const getAuthenticationStateLabel = (
  arg?: AuthenticationStatus_State,
): string => {
  switch (arg) {
    case AuthenticationStatus_State.AUTHENTICATED:
      return "Signed in";
    case AuthenticationStatus_State.AUTHENTICATING:
      return "Signing in";
    case AuthenticationStatus_State.LOGGING_OUT:
      return "Signing out";
    default:
      return "Signed out";
  }
};

export const getAuthenticationStateTone = (
  arg?: AuthenticationStatus_State,
): LabelTone => {
  switch (arg) {
    case AuthenticationStatus_State.AUTHENTICATED:
      return "emerald";
    case AuthenticationStatus_State.AUTHENTICATING:
    case AuthenticationStatus_State.LOGGING_OUT:
      return "amber";
    default:
      return "slate";
  }
};

export const getOperationTypeLabel = (arg?: Operation_Type): string => {
  switch (arg) {
    case Operation_Type.AUTHENTICATE:
      return "Signing in";
    case Operation_Type.CONNECT:
      return "Connecting";
    case Operation_Type.DISCONNECT:
      return "Disconnecting";
    case Operation_Type.LOGOUT:
      return "Signing out";
    case Operation_Type.DELETE:
      return "Removing";
    default:
      return "Working";
  }
};

export const getTunnelModeLabel = (arg?: ConnectionOptions_TunnelMode): string => {
  switch (arg) {
    case ConnectionOptions_TunnelMode.WIREGUARD:
      return "WireGuard";
    case ConnectionOptions_TunnelMode.QUICV0:
      return "QUIC";
    default:
      return "Automatic";
  }
};

export const getImplementationModeLabel = (
  arg?: ConnectionOptions_ImplementationMode,
): string => {
  switch (arg) {
    case ConnectionOptions_ImplementationMode.KERNEL:
      return "Kernel";
    case ConnectionOptions_ImplementationMode.TUN:
      return "TUN";
    case ConnectionOptions_ImplementationMode.GVISOR:
      return "gVisor";
    default:
      return "Automatic";
  }
};

export const getL3ModeLabel = (arg?: ConnectionOptions_L3Mode): string => {
  switch (arg) {
    case ConnectionOptions_L3Mode.V4:
      return "IPv4 only";
    case ConnectionOptions_L3Mode.V6:
      return "IPv6 only";
    case ConnectionOptions_L3Mode.BOTH:
      return "Dual stack";
    default:
      return "Automatic";
  }
};

export const getDNSModeLabel = (arg?: ConnectionOptions_DNS_Mode): string => {
  switch (arg) {
    case ConnectionOptions_DNS_Mode.DISABLED:
      return "Disabled";
    case ConnectionOptions_DNS_Mode.FULL:
      return "Full";
    default:
      return "Split";
  }
};

export const getErrorTitle = (arg?: DaemonError): string => {
  switch (arg?.code) {
    case Error_Code.AUTHENTICATION_REQUIRED:
      return "Sign in required";
    case Error_Code.AUTHENTICATION_FAILED:
      return "Sign in failed";
    case Error_Code.AUTHENTICATION_TIMED_OUT:
      return "Sign in timed out";
    case Error_Code.CLUSTER_UNREACHABLE:
      return "Cluster unreachable";
    case Error_Code.CONNECTION_FAILED:
      return "Connection failed";
    case Error_Code.NETWORK_CONFIGURATION_FAILED:
      return "Network configuration failed";
    case Error_Code.DNS_CONFIGURATION_FAILED:
      return "DNS configuration failed";
    case Error_Code.LOCAL_PORT_CONFLICT:
      return "Local port already in use";
    case Error_Code.PERMISSION_DENIED:
      return "Not permitted";
    case Error_Code.OPERATION_CANCELED:
      return "Canceled";
    default:
      return "Something went wrong";
  }
};

export const getErrorHint = (arg?: DaemonError): string | undefined => {
  switch (arg?.code) {
    case Error_Code.AUTHENTICATION_REQUIRED:
      return "Your credentials are no longer usable. Sign in to the Cluster again.";
    case Error_Code.AUTHENTICATION_TIMED_OUT:
      return "The browser sign in was not completed in time. Try again.";
    case Error_Code.CLUSTER_UNREACHABLE:
      return "Check your Internet connection and that the Cluster domain is correct.";
    case Error_Code.NETWORK_CONFIGURATION_FAILED:
      return "The local network device, addresses or routes could not be configured.";
    case Error_Code.DNS_CONFIGURATION_FAILED:
      return "The host DNS configuration could not be applied.";
    case Error_Code.LOCAL_PORT_CONFLICT:
      return "Another process is already listening at one of the configured ports.";
    case Error_Code.PERMISSION_DENIED:
      return "This operation is not permitted for your local user.";
    default:
      return undefined;
  }
};

export const isErrorRetryable = (arg?: DaemonError): boolean =>
  arg !== undefined &&
  arg.retryable &&
  arg.code !== Error_Code.OPERATION_CANCELED;

export const getDomainState = (
  status?: GetStatusResponse,
  domain?: string,
): DomainState | undefined => {
  if (!status || !domain) {
    return undefined;
  }

  return status.domains.find((itm) => itm.domain === domain);
};

export const getDomains = (status?: GetStatusResponse): string[] =>
  (status?.domains ?? []).map((itm) => itm.domain).sort();

export const selectDomain = (
  status?: GetStatusResponse,
  preferred?: string,
): string | undefined => {
  const domains = status?.domains ?? [];
  if (domains.length < 1) {
    return undefined;
  }

  if (preferred && domains.some((itm) => itm.domain === preferred)) {
    return preferred;
  }

  const connected = domains.find((itm) => isConnected(itm));
  if (connected) {
    return connected.domain;
  }

  const authenticated = domains.find((itm) => isAuthenticated(itm));
  if (authenticated) {
    return authenticated.domain;
  }

  return domains
    .map((itm) => itm.domain)
    .sort()
    .at(0);
};

export const validateDomain = (arg: string): string | undefined => {
  const domain = arg.trim().toLowerCase();

  if (domain === "") {
    return "The Cluster domain is required";
  }

  if (domain.length > 253) {
    return "The Cluster domain is too long";
  }

  if (domain.split(".").some((label) => label.length > 63)) {
    return "A Cluster domain label is too long";
  }

  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain)) {
    return "Invalid Cluster domain";
  }

  return undefined;
};

export const normalizeDomain = (arg: string): string => {
  let ret = arg.trim().toLowerCase();

  ret = ret.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  ret = ret.split("/")[0];
  ret = ret.split("?")[0];
  ret = ret.split("#")[0];
  ret = ret.split("@").at(-1) ?? ret;
  ret = ret.replace(/\.+$/, "");

  try {
    ret = new URL(`https://${ret}`).hostname;
  } catch {
    return ret;
  }

  return ret;
};
