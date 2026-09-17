import DaemonUnavailable from "@/components/DaemonUnavailable";
import Footer from "@/components/Footer";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import OperationBanner from "@/components/OperationBanner";
import {
  useDaemonWatch,
  useDomainState,
  useSelectedDomain,
  useSessionCacheLifecycle,
} from "@/features/daemon/hooks";
import { getActiveOperation } from "@/utils/daemon";
import { useNativeIntegration } from "@/utils/hooks/native";
import { AppShell, Burger } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useAppSelector } from "@/utils/hooks";
import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

const Root = () => {
  const [opened, { toggle, close }] = useDisclosure(false);
  const location = useLocation();
  const availability = useAppSelector((state) => state.daemon.availability);
  const selectedDomain = useAppSelector(
    (state) => state.daemon.selectedDomain,
  );
  const domainState = useDomainState(selectedDomain);

  useDaemonWatch();
  useSelectedDomain();
  useSessionCacheLifecycle();
  const { platform } = useNativeIntegration();

  useEffect(() => {
    close();
  }, [close, location.pathname]);

  return (
    <div className="min-h-screen">
      <title>Octelium</title>
      <div className="min-h-screen bg-app antialiased">
        <AppShell
          className="!bg-transparent"
          header={{ height: 60 }}
          navbar={{
            width: 236,
            breakpoint: "sm",
            collapsed: { mobile: !opened },
          }}
          padding="md"
        >
          <AppShell.Header className="border-line !bg-app">
            <div className="flex h-full items-center">
              <Burger
                opened={opened}
                onClick={toggle}
                hiddenFrom="sm"
                size="sm"
                aria-label={opened ? "Close navigation" : "Open navigation"}
              />
              <TopBar />
            </div>
          </AppShell.Header>

          <AppShell.Navbar className="border-line !bg-app" p="md">
            <Sidebar onNavigate={close} />
          </AppShell.Navbar>

          <AppShell.Main className="min-h-screen !bg-transparent">
            {availability === "available" ? (
              <div className="mx-auto flex min-h-[calc(100vh-60px)] w-full max-w-6xl flex-col">
                <div className="min-w-0 flex-1">
                  <OperationBanner
                    operation={getActiveOperation(domainState)}
                  />
                  <Outlet />
                </div>
                <Footer />
              </div>
            ) : (
              <DaemonUnavailable platform={platform} />
            )}
          </AppShell.Main>
        </AppShell>
      </div>
    </div>
  );
};

export default Root;
