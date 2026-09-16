import { useSelectDomain } from "@/features/daemon/hooks";
import StatusDot from "@/components/StatusDot";
import {
  getConnectionStateLabel,
  getConnectionStateTone,
  isConnectionBusy,
} from "@/utils/daemon";
import { useAppSelector } from "@/utils/hooks";
import { Menu, UnstyledButton } from "@mantine/core";
import { ChevronRight, ChevronsUpDown, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DomainSwitcher = () => {
  const navigate = useNavigate();
  const selectDomain = useSelectDomain();
  const status = useAppSelector((state) => state.daemon.status);
  const selected = useAppSelector((state) => state.daemon.selectedDomain);
  const multiCluster = useAppSelector(
    (state) => state.prefs.prefs.multiCluster,
  );

  const domains = status?.domains ?? [];
  const current = domains.find((itm) => itm.domain === selected);

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
          {current
            ? getConnectionStateLabel(current.connection?.state)
            : selected
              ? "Sign in required"
              : "Add your Cluster domain"}
        </div>
      </div>
    </>
  );

  if (!multiCluster && domains.length <= 1) {
    return (
      <UnstyledButton
        aria-label="Open Connection"
        className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-3 text-left shadow-xs transition-colors hover:border-line-strong hover:bg-surface-2"
        onClick={() => navigate("/connection")}
      >
        {content}
        <ChevronRight size={16} className="flex-none text-faint" aria-hidden />
      </UnstyledButton>
    );
  }

  return (
    <Menu shadow="md" radius="md" width="target" position="bottom-start">
      <Menu.Target>
        <UnstyledButton
          aria-label="Switch Cluster"
          className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-3 text-left shadow-xs transition-colors hover:border-line-strong hover:bg-surface-2"
        >
          {content}
          <ChevronsUpDown size={16} className="flex-none text-faint" aria-hidden />
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Cluster domains</Menu.Label>
        {domains.map((itm) => (
          <Menu.Item
            key={itm.domain}
            className="font-bold"
            leftSection={
              <StatusDot tone={getConnectionStateTone(itm.connection?.state)} />
            }
            onClick={() => selectDomain(itm.domain)}
          >
            <span className="truncate">{itm.domain}</span>
          </Menu.Item>
        ))}
        {domains.length > 0 && <Menu.Divider />}
        <Menu.Item
          className="font-bold"
          leftSection={<Plus size={15} aria-hidden />}
          onClick={() => navigate("/clusters")}
        >
          Manage domains
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

export default DomainSwitcher;
