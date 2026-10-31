import DaemonUnavailable from "@/components/DaemonUnavailable";
import Notice from "@/components/Notice";
import OperationBanner from "@/components/OperationBanner";
import Sidebar from "@/components/Sidebar";
import SignOutModal from "@/components/SignOutModal";
import TopBar from "@/components/TopBar";
import {
  useDaemonWatch,
  useDomainState,
  useSelectedDomain,
  useSessionCacheLifecycle,
} from "@/features/daemon/hooks";
import { getActiveOperation } from "@/utils/daemon";
import { useAppSelector } from "@/utils/hooks";
import { useNativeIntegration } from "@/utils/hooks/native";
import { AlertTriangle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

const Root = () => {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const [signOutDomain, setSignOutDomain] = useState<string | undefined>(undefined);
  const availability = useAppSelector((state) => state.daemon.availability);
  const selectedDomain = useAppSelector(
    (state) => state.daemon.selectedDomain,
  );
  const domainState = useDomainState(selectedDomain);
  const daemonIndependent =
    location.pathname === "/settings" || location.pathname === "/diagnostics";
  const showContent = availability === "available" || daemonIndependent;

  useDaemonWatch();
  useSelectedDomain();
  useSessionCacheLifecycle();
  const { platform, trayError } = useNativeIntegration(setSignOutDomain);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="flex h-full w-full flex-col bg-app text-strong">
      <title>Octelium</title>
      <TopBar onSignOut={setSignOutDomain} />

      <div className="flex min-h-0 flex-1">
        <Sidebar onSignOut={setSignOutDomain} />

        <main
          ref={mainRef}
          className="min-w-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]"
        >
          {showContent ? (
            <div
              key={location.pathname}
              className="mx-auto flex w-full max-w-5xl animate-page-in flex-col px-6 pt-6 pb-10"
            >
              {trayError && (
                <Notice
                  tone="rose"
                  className="mb-4"
                  icon={<AlertTriangle size={15} aria-hidden />}
                  title="The tray action failed"
                >
                  {trayError}
                </Notice>
              )}
              {availability !== "available" && (
                <DaemonUnavailable compact platform={platform} />
              )}
              {availability === "available" && (
                <OperationBanner operation={getActiveOperation(domainState)} />
              )}
              <Outlet />
            </div>
          ) : (
            <DaemonUnavailable platform={platform} />
          )}
        </main>
      </div>

      {signOutDomain && (
        <SignOutModal
          key={signOutDomain}
          domain={signOutDomain}
          onClose={() => setSignOutDomain(undefined)}
        />
      )}
    </div>
  );
};

export default Root;
