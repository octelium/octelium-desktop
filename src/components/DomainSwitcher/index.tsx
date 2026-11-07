/// <reference types="vite-plugin-svgr/client" />

import Mark from "@/assets/mark.svg?react";
import StatusDot from "@/components/StatusDot";
import { useDomainState, useSelectDomain } from "@/features/daemon/hooks";
import {
  getAuthenticationStateLabel,
  getConnectionStateLabel,
  getConnectionStateTone,
  isAuthenticated,
  isConnectionBusy,
} from "@/utils/daemon";
import { useAppSelector } from "@/utils/hooks";
import { Menu, UnstyledButton } from "@mantine/core";
import { Check, ChevronsUpDown, Settings2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DomainSwitcher = () => {
  const navigate = useNavigate();
  const selectDomain = useSelectDomain();
  const status = useAppSelector((state) => state.daemon.status);
  const selected = useAppSelector((state) => state.daemon.selectedDomain);
  const multiCluster = useAppSelector(
    (state) => state.prefs.prefs.multiCluster,
  );
  const current = useDomainState(selected);

  const domains = status?.domains ?? [];
  const visibleDomains = multiCluster
    ? domains
    : current
      ? [current]
      : domains.slice(0, 1);
  const stateLabel = current
    ? isAuthenticated(current)
      ? getConnectionStateLabel(current.connection?.state)
      : getAuthenticationStateLabel(current.authentication?.state)
    : selected
      ? "Sign in required"
      : "No Cluster yet";

  return (
    <Menu width="target" position="bottom-start" offset={6}>
      <Menu.Target>
        <UnstyledButton
          aria-label="Open the Cluster menu"
          className="group flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors duration-150 hover:bg-surface-active/50 data-[expanded]:bg-surface-active/50"
        >
          <span className="relative flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-line bg-surface text-strong shadow-card">
            <Mark className="h-[17px] w-[17px]" aria-hidden />
            <span className="absolute -right-0.5 -bottom-0.5 flex rounded-full bg-surface p-[2px]">
              <StatusDot
                size={8}
                tone={getConnectionStateTone(current?.connection?.state)}
                pulse={isConnectionBusy(current)}
              />
            </span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-ui leading-tight font-semibold text-strong">
              {selected ?? "Set up Octelium"}
            </span>
            <span className="block truncate text-micro font-normal text-muted">
              {stateLabel}
            </span>
          </span>
          <ChevronsUpDown
            size={14}
            className="flex-none text-faint transition-colors group-hover:text-muted"
            aria-hidden
          />
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        {visibleDomains.length > 0 && <Menu.Label>Clusters</Menu.Label>}
        {visibleDomains.map((item) => (
          <Menu.Item
            key={item.domain}
            leftSection={
              <StatusDot
                tone={getConnectionStateTone(item.connection?.state)}
              />
            }
            rightSection={
              item.domain === selected ? (
                <Check size={14} className="text-muted" aria-hidden />
              ) : undefined
            }
            onClick={() => selectDomain(item.domain)}
          >
            <span className="block truncate">{item.domain}</span>
          </Menu.Item>
        ))}
        {visibleDomains.length > 0 && <Menu.Divider />}
        <Menu.Item
          leftSection={<Settings2 size={14} aria-hidden />}
          onClick={() => navigate("/settings?section=clusters")}
        >
          Manage Clusters
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

export default DomainSwitcher;
