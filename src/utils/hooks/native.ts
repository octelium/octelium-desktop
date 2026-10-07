import { getErrorMessage } from "@/features/daemon/actions";
import { useSelectDomain } from "@/features/daemon/hooks";
import { ConnectionStatus_State } from "@/gen/client/daemonv1";
import { useAppSelector } from "@/utils/hooks";
import { getAppInfo, isNative, notify, showWindow, updateTray } from "@/utils/native";
import {
  getTraySummary,
  handleTrayAction,
  type TrayAction,
} from "@/utils/native/tray";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isPermissionGranted } from "@tauri-apps/plugin-notification";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export const useNativeIntegration = (onSignOut: (domain: string) => void) => {
  const navigate = useNavigate();
  const selectDomain = useSelectDomain();
  const [platform, setPlatform] = useState<string | undefined>(undefined);
  const [trayError, setTrayError] = useState<string | undefined>(undefined);

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
  const prefersDark = useAppSelector((state) => state.prefs.prefersDark);

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

    const summary = getTraySummary(
      availability === "available",
      prefersDark,
      status,
      selected,
    );
    void updateTray(summary).catch(() => {});
  }, [availability, prefersDark, selected, status]);

  useEffect(() => {
    if (!isNative()) {
      return;
    }

    const unlisten = listen<TrayAction>("tray-action", (ev) => {
      setTrayError(undefined);
      void handleTrayAction(ev.payload, {
        selected: selectedRef.current,
        selectDomain,
        navigate,
        onSignOut,
      }).catch((error) => setTrayError(getErrorMessage(error)));
    });

    return () => {
      void unlisten.then((fn) => fn());
    };
  }, [navigate, onSignOut, selectDomain]);

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

  return { platform, trayError };
};
