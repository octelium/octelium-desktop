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
import { ChevronDown, ChevronsUpDown, Plus } from "lucide-react";
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
      : "Add your Cluster domain";

  const content = (
    <>
      <StatusDot
        tone={getConnectionStateTone(current?.connection?.state)}
        pulse={isConnectionBusy(current)}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-strong">
          {selected ?? "Set up Octelium"}
        </div>
        <div className="truncate text-[11px] font-medium text-muted">
          {stateLabel}
        </div>
      </div>
    </>
  );

  return (
    <Menu shadow="md" radius="md" width="target" position="bottom-start">
      <Menu.Target>
        <UnstyledButton
          aria-label="Open Cluster menu"
          className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-3 text-left shadow-xs transition-colors hover:border-line-strong hover:bg-surface-2"
        >
          {content}
          {multiCluster && domains.length > 1 ? (
            <ChevronsUpDown
              size={16}
              className="flex-none text-faint"
              aria-hidden
            />
          ) : (
            <ChevronDown
              size={16}
              className="flex-none text-faint"
              aria-hidden
            />
          )}
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Cluster domains</Menu.Label>
        {visibleDomains.map((item) => (
          <Menu.Item
            key={item.domain}
            className="font-bold"
            leftSection={
              <StatusDot
                tone={getConnectionStateTone(item.connection?.state)}
              />
            }
            onClick={() => selectDomain(item.domain)}
          >
            <span className="truncate">{item.domain}</span>
          </Menu.Item>
        ))}
        {domains.length > 0 && <Menu.Divider />}
        <Menu.Item
          className="font-bold"
          leftSection={<Plus size={15} aria-hidden />}
          onClick={() => navigate("/settings?section=clusters")}
        >
          Manage Clusters
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

export default DomainSwitcher;
