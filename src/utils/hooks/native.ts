import { connect, disconnect } from "@/features/daemon/actions";
import type { GetStatusResponse } from "@/gen/client/daemonv1";
import { ConnectionStatus_State } from "@/gen/client/daemonv1";
import { isConnectionBusy, isAuthenticated, isConnected } from "@/utils/daemon";
import { useAppSelector } from "@/utils/hooks";
import { getAppInfo, isNative, notify, showWindow, updateTray } from "@/utils/native";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isPermissionGranted } from "@tauri-apps/plugin-notification";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

type TrayAction = {
  action: "connect" | "disconnect" | "navigate";
  domain?: string;
  path?: string;
};

const getTraySummary = (available: boolean, status?: GetStatusResponse) => ({
  available,
  domains: (status?.domains ?? []).map((itm) => ({
    domain: itm.domain,
    connected: isConnected(itm),
    busy: isConnectionBusy(itm),
    authenticated: isAuthenticated(itm),
  })),
});

export const useNativeIntegration = () => {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState<string | undefined>(undefined);

  const availability = useAppSelector((state) => state.daemon.availability);
  const status = useAppSelector((state) => state.daemon.status);
  const selected = useAppSelector((state) => state.daemon.selectedDomain);
  const notifications = useAppSelector(
    (state) => state.prefs.prefs.notifications,
  );
  const closeToTray = useAppSelector((state) => state.prefs.prefs.closeToTray);
  const startMinimized = useAppSelector(
    (state) => state.prefs.prefs.startMinimized,
  );
  const isLoaded = useAppSelector((state) => state.prefs.isLoaded);

  const selectedRef = useRef(selected);
  const closeToTrayRef = useRef(closeToTray);
  const statesRef = useRef(new Map<string, ConnectionStatus_State>());
  const isShownRef = useRef(false);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    closeToTrayRef.current = closeToTray;
  }, [closeToTray]);

  useEffect(() => {
    if (!isNative()) {
      return;
    }

    void getAppInfo()
      .then((ret) => setPlatform(ret.platform))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isNative() || !isLoaded || isShownRef.current) {
      return;
    }

    isShownRef.current = true;

    if (!startMinimized) {
      void showWindow().catch(() => {});
    }
  }, [isLoaded, startMinimized]);

  useEffect(() => {
    if (!isNative()) {
      return;
    }

    const unlisten = getCurrentWindow().onCloseRequested(async (event) => {
      if (!closeToTrayRef.current) {
        return;
      }

      event.preventDefault();
      await getCurrentWindow().hide();
    });

    return () => {
      void unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    if (!isNative()) {
      return;
    }

    const summary = getTraySummary(availability === "available", status);
    if (selected) {
      summary.domains = summary.domains.filter(
        (item) => item.domain === selected,
      );
      if (summary.domains.length === 0) {
        summary.domains = [
          {
            domain: selected,
            connected: false,
            busy: false,
            authenticated: false,
          },
        ];
      }
    } else {
      summary.domains = summary.domains.slice(0, 1);
    }
    void updateTray(summary).catch(() => {});
  }, [availability, selected, status]);

  useEffect(() => {
    if (!isNative()) {
      return;
    }

    const unlisten = listen<TrayAction>("tray-action", (ev) => {
      const domain = ev.payload.domain ?? selectedRef.current;

      switch (ev.payload.action) {
        case "connect":
          if (domain) {
            void connect(domain).catch(() => {});
          }
          return;
        case "disconnect":
          if (domain) {
            void disconnect(domain).catch(() => {});
          }
          return;
        case "navigate":
          navigate(ev.payload.path ?? "/connection");
          return;
      }
    });

    return () => {
      void unlisten.then((fn) => fn());
    };
  }, [navigate]);

  useEffect(() => {
    if (!status) {
      return;
    }

    const states = statesRef.current;
    const sendNotification = async (message: string) => {
      if (await isPermissionGranted()) {
        await notify("Octelium", message);
      }
    };

    for (const itm of status.domains) {
      const previous = states.get(itm.domain);
      const current = itm.connection?.state ?? ConnectionStatus_State.DISCONNECTED;

      states.set(itm.domain, current);

      if (previous === undefined || previous === current || !notifications) {
        continue;
      }

      if (current === ConnectionStatus_State.CONNECTED) {
        void sendNotification(`Connected to ${itm.domain}`).catch(() => {});
        continue;
      }

      if (
        current === ConnectionStatus_State.DISCONNECTED &&
        (previous === ConnectionStatus_State.CONNECTED ||
          previous === ConnectionStatus_State.RECONNECTING)
      ) {
        void sendNotification(`Disconnected from ${itm.domain}`).catch(() => {});
      }
    }

    for (const domain of [...states.keys()]) {
      if (!status.domains.some((itm) => itm.domain === domain)) {
        states.delete(domain);
      }
    }
  }, [notifications, status]);

  return { platform };
};
