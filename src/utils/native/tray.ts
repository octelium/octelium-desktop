import {
  authenticateBrowser,
  connect,
  disconnect,
} from "@/features/daemon/actions";
import { Error_Code, type GetStatusResponse } from "@/gen/client/daemonv1";
import {
  getActiveOperation,
  getConnectionStateLabel,
  getOperationTypeLabel,
  getPendingOpenURL,
  isAuthenticated,
  isConnected,
  isConnectionBusy,
} from "@/utils/daemon";
import { openExternal, type TraySummary } from "@/utils/native";

export type TrayAction = {
  action: "connect" | "disconnect" | "sign-in" | "sign-out" | "navigate";
  domain?: string;
  path?: string;
};

export const getTraySummary = (
  available: boolean,
  dark: boolean,
  status?: GetStatusResponse,
  selected?: string,
): TraySummary => {
  const domains = (status?.domains ?? [])
    .filter((item) => !selected || item.domain === selected)
    .slice(0, 1)
    .map((item) => {
      const operation = getActiveOperation(item);
      return {
        domain: item.domain,
        connected: isConnected(item),
        busy: isConnectionBusy(item) || !!operation,
        authenticated: isAuthenticated(item),
        authenticationRequired:
          item.lastError?.code === Error_Code.AUTHENTICATION_REQUIRED,
        state: operation
          ? getOperationTypeLabel(operation.type)
          : getConnectionStateLabel(item.connection?.state),
      };
    });

  if (selected && domains.length === 0) {
    domains.push({
      domain: selected,
      connected: false,
      busy: false,
      authenticated: false,
      authenticationRequired: false,
      state: getConnectionStateLabel(),
    });
  }

  return { available, dark, domains };
};

export const handleTrayAction = async (
  action: TrayAction,
  handlers: {
    selected?: string;
    selectDomain: (domain: string) => void;
    navigate: (path: string) => void;
    onSignOut: (domain: string) => void;
  },
): Promise<void> => {
  const domain = action.domain ?? handlers.selected;

  switch (action.action) {
    case "connect":
      if (domain) {
        await connect(domain);
      }
      return;
    case "disconnect":
      if (domain) {
        await disconnect(domain);
      }
      return;
    case "sign-in": {
      handlers.navigate("/connection");
      if (!domain) {
        return;
      }
      handlers.selectDomain(domain);
      const operation = await authenticateBrowser(domain);
      handlers.selectDomain(operation.domain || domain);
      const url = getPendingOpenURL({ domain, lastOperation: operation });
      if (url) {
        await openExternal(url);
      }
      return;
    }
    case "sign-out":
      if (domain) {
        handlers.onSignOut(domain);
      }
      return;
    case "navigate":
      handlers.navigate(action.path ?? "/connection");
      return;
  }
};
