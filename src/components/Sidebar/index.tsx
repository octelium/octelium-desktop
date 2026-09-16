import DomainSwitcher from "@/components/DomainSwitcher";
import {
  Activity,
  PanelTop,
  Server,
  Settings as SettingsIcon,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAppSelector } from "@/utils/hooks";

const items = [
  {
    title: "Connection",
    url: "/connection",
    icon: Activity,
  },
  {
    title: "Services",
    url: "/services",
    icon: PanelTop,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: SettingsIcon,
  },
];

export default function Sidebar(props: { onNavigate?: () => void }) {
  const multiCluster = useAppSelector(
    (state) => state.prefs.prefs.multiCluster,
  );

  return (
    <div className="flex h-full w-full flex-col">
      <DomainSwitcher />

      <nav aria-label="Application navigation" className="mt-4 space-y-1">
        {[
          ...items,
          ...(multiCluster
            ? [{ title: "Clusters", url: "/clusters", icon: Server }]
            : []),
        ].map(({ title, url, icon: Icon }) => (
          <NavLink
            key={url}
            to={url}
            onClick={props.onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 ${
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

      <div className="mt-auto flex flex-col border-t border-line pt-4">
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
