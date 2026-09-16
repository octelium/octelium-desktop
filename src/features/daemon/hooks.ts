import { setInfo, setSelectedDomain, setStatus, setUnavailable } from "@/features/daemon/slice";
import { setPrimaryDomain } from "@/features/prefs/slice";
import { getClientDaemon } from "@/utils/client";
import { getDomainState, selectDomain } from "@/utils/daemon";
import { useAppDispatch, useAppSelector } from "@/utils/hooks";
import { clearDomainSession } from "@/utils/session";
import { getRpcError } from "@/utils/transport";
import { useCallback, useEffect, useRef } from "react";

import { API_MAJOR_VERSION, getErrorMessage } from "./actions";

const RETRY_INTERVAL_MS = 2000;

export const useDaemonWatch = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const abort = new AbortController();
    let timer: number | undefined;
    let isClosed = false;

    const schedule = () => {
      if (isClosed) {
        return;
      }
      timer = window.setTimeout(() => void run(), RETRY_INTERVAL_MS);
    };

    const run = async () => {
      if (isClosed) {
        return;
      }

      const c = getClientDaemon();

      try {
        const { response: info } = await c.getInfo({}, { abort: abort.signal });
        if (isClosed) {
          return;
        }

        dispatch(setInfo({ info }));

        if (info.apiMajorVersion !== API_MAJOR_VERSION) {
          dispatch(
            setUnavailable({
              availability: "incompatible",
              error: `The Octelium daemon implements the local API version ${info.apiMajorVersion} while this application requires the version ${API_MAJOR_VERSION}`,
            }),
          );
          schedule();
          return;
        }
      } catch (err) {
        if (isClosed) {
          return;
        }
        dispatch(setUnavailable({ error: getErrorMessage(err) }));
        schedule();
        return;
      }

      try {
        const call = c.watchStatus({}, { abort: abort.signal });

        for await (const status of call.responses) {
          if (isClosed) {
            return;
          }
          dispatch(setStatus({ status }));
        }
      } catch (err) {
        if (isClosed || getRpcError(err).code === "CANCELLED") {
          return;
        }
        dispatch(setUnavailable({ error: getErrorMessage(err) }));
      }

      schedule();
    };

    void run();

    return () => {
      isClosed = true;
      window.clearTimeout(timer);
      abort.abort();
    };
  }, [dispatch]);
};

export const useSelectedDomain = () => {
  const dispatch = useAppDispatch();
  const status = useAppSelector((state) => state.daemon.status);
  const selected = useAppSelector((state) => state.daemon.selectedDomain);
  const primaryDomain = useAppSelector(
    (state) => state.prefs.prefs.primaryDomain,
  );
  const isLoaded = useAppSelector((state) => state.prefs.isLoaded);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    const next = primaryDomain ?? selectDomain(status, selected);
    if (next === selected) {
      return;
    }

    dispatch(setSelectedDomain({ domain: next }));
    if (!primaryDomain && next) {
      dispatch(setPrimaryDomain({ domain: next }));
    }
  }, [dispatch, isLoaded, primaryDomain, selected, status]);

  return selected;
};

export const useDomainState = (domain?: string) => {
  const status = useAppSelector((state) => state.daemon.status);
  return getDomainState(status, domain);
};

export const useSessionCacheLifecycle = () => {
  const status = useAppSelector((state) => state.daemon.status);
  const previousRef = useRef(new Map<string, string>());

  useEffect(() => {
    if (!status) {
      return;
    }

    const previous = previousRef.current;
    const current = new Map<string, string>();

    for (const item of status.domains) {
      const authenticatedAt = item.authentication?.authenticatedAt;
      const key = `${item.authentication?.state ?? 0}:${authenticatedAt?.seconds ?? 0}:${authenticatedAt?.nanos ?? 0}`;
      current.set(item.domain, key);
      const oldKey = previous.get(item.domain);
      if (oldKey !== undefined && oldKey !== key) {
        void clearDomainSession(item.domain).catch(() => {});
      }
    }

    for (const domain of previous.keys()) {
      if (!current.has(domain)) {
        void clearDomainSession(domain).catch(() => {});
      }
    }

    previousRef.current = current;
  }, [status]);
};

export const useSelectDomain = () => {
  const dispatch = useAppDispatch();

  return useCallback(
    (domain?: string) => {
      dispatch(setSelectedDomain({ domain }));
      dispatch(setPrimaryDomain({ domain }));
    },
    [dispatch],
  );
};
