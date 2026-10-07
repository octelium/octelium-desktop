import DomainSwitcher from "@/components/DomainSwitcher";
import { useDomainState } from "@/features/daemon/hooks";
import { isAuthenticated } from "@/utils/daemon";
import { useAppSelector } from "@/utils/hooks";
import {
  Activity,
  LogIn,
  LogOut,
  PanelTop,
  Settings as SettingsIcon,
} from "lucide-react";
import { NavLink } from "react-router-dom";

export default function Sidebar(props: {
  onNavigate?: () => void;
  onSignOut: (domain: string) => void;
}) {
  const domain = useAppSelector((state) => state.daemon.selectedDomain);
  const state = useDomainState(domain);
  const authenticated = isAuthenticated(state);

  const items = [
    {
      title: authenticated ? "Connection" : "Sign in",
      url: "/connection",
      icon: authenticated ? Activity : LogIn,
    },
    ...(authenticated
      ? [{ title: "Services", url: "/services", icon: PanelTop }]
      : []),
    {
      title: "Settings",
      url: "/settings",
      icon: SettingsIcon,
    },
  ];

  return (
    <div className="flex h-full w-full flex-col">
      <DomainSwitcher />

      <nav aria-label="Application navigation" className="mt-4 space-y-1">
        {items.map(({ title, url, icon: Icon }) => (
          <NavLink
            key={url}
            to={url}
            onClick={props.onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-strong ${
                isActive
                  ? "bg-inverse text-inverse-fg shadow-md"
                  : "text-body hover:bg-surface-3 hover:text-strong"
              }`
            }
          >
            <Icon size={18} aria-hidden />
            <span>{title}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-1 border-t border-line pt-4">
        {authenticated && domain && (
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-muted transition-colors hover:bg-surface-3 hover:text-strong"
            onClick={() => props.onSignOut(domain)}
          >
            <LogOut size={15} aria-hidden />
            Sign out
          </button>
        )}
        <NavLink
          to="/diagnostics"
          onClick={props.onNavigate}
          className="flex items-center justify-center rounded-lg px-3 py-2 text-xs font-bold text-muted transition-colors hover:bg-surface-3 hover:text-strong"
        >
          Diagnostics
        </NavLink>
      </div>
    </div>
  );
}
