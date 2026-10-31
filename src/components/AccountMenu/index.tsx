import Avatar from "@/components/Avatar";
import { useClusterStatus, useDomainState } from "@/features/daemon/hooks";
import { isAuthenticated } from "@/utils/daemon";
import { useAppSelector } from "@/utils/hooks";
import { getUserDisplayName, getUserPicURL } from "@/utils/octelium";
import { Menu } from "@mantine/core";
import {
  Activity,
  ChevronDown,
  LogOut,
  Server,
  Settings,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const AccountMenu = (props: { onSignOut: (domain: string) => void }) => {
  const navigate = useNavigate();
  const domain = useAppSelector((state) => state.daemon.selectedDomain);
  const state = useDomainState(domain);
  const statusQuery = useClusterStatus(domain);

  if (!domain || !isAuthenticated(state)) {
    return null;
  }

  const status = statusQuery.data;
  const displayName = getUserDisplayName(status);
  const email = status?.user?.spec?.email?.trim();

  return (
    <Menu position="bottom-end" width={260} withinPortal>
      <Menu.Target>
        <button
          type="button"
          aria-label={
            displayName ? `Account menu for ${displayName}` : "Account menu"
          }
          className="flex h-9 min-w-0 flex-none items-center gap-2 rounded-lg py-1 pr-1.5 pl-1 outline-none transition-colors hover:bg-surface-3 focus-visible:ring-2 focus-visible:ring-focus data-[expanded]:bg-surface-3"
        >
          <Avatar src={getUserPicURL(status)} name={displayName} size="sm" />
          {displayName && (
            <span className="hidden max-w-[160px] truncate text-ui font-medium text-strong md:block">
              {displayName}
            </span>
          )}
          <ChevronDown
            size={13}
            strokeWidth={2.25}
            className="flex-none text-muted"
            aria-hidden
          />
        </button>
      </Menu.Target>

      <Menu.Dropdown>
        <div className="flex min-w-0 items-center gap-3 px-2.5 pt-2 pb-2.5">
          <Avatar src={getUserPicURL(status)} name={displayName} size="md" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-ui font-medium text-strong">
              {displayName ?? "Signed in"}
            </span>
            {email && (
              <span className="truncate text-xs text-muted" data-selectable>
                {email}
              </span>
            )}
            <span className="truncate text-xs text-faint">{domain}</span>
          </div>
        </div>
        <Menu.Divider />
        <Menu.Item
          leftSection={<Activity size={14} aria-hidden />}
          onClick={() => navigate("/connection")}
        >
          Connection
        </Menu.Item>
        <Menu.Item
          leftSection={<Server size={14} aria-hidden />}
          onClick={() => navigate("/settings?section=cluster")}
        >
          Cluster settings
        </Menu.Item>
        <Menu.Item
          leftSection={<Settings size={14} aria-hidden />}
          onClick={() => navigate("/settings")}
        >
          Application settings
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item
          color="red"
          leftSection={<LogOut size={14} aria-hidden />}
          onClick={() => props.onSignOut(domain)}
        >
          Sign out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};

export default AccountMenu;
