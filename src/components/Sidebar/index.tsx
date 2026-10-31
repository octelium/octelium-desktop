import DomainSwitcher from "@/components/DomainSwitcher";
import ExternalLink from "@/components/ExternalLink";
import { useDomainState } from "@/features/daemon/hooks";
import { isAuthenticated } from "@/utils/daemon";
import { useAppSelector } from "@/utils/hooks";
import { currentAppVersion } from "@/utils/version";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Boxes,
  LogIn,
  LogOut,
  PanelTop,
  Settings as SettingsIcon,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import { LuGithub } from "react-icons/lu";
import { NavLink } from "react-router-dom";
import { twMerge } from "@/utils/tailwind";

const rowClass =
  "flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-ui outline-none transition-[background-color,color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-focus";

const inactiveClass = "text-body hover:bg-surface-3 hover:text-strong";

const NavItem = (props: {
  to: string;
  title: string;
  icon: LucideIcon;
}) => (
  <NavLink
    to={props.to}
    className={({ isActive }) =>
      twMerge(
        rowClass,
        isActive
          ? "bg-surface font-medium text-strong shadow-card ring-1 ring-line"
          : inactiveClass,
      )
    }
  >
    {({ isActive }) => (
      <>
        <props.icon
          size={16}
          strokeWidth={isActive ? 2.25 : 1.75}
          className="flex-none"
          aria-hidden
        />
        <span className="truncate">{props.title}</span>
      </>
    )}
  </NavLink>
);

const ResourceLink = (props: {
  href: string;
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}) => (
  <ExternalLink
    href={props.href}
    className={twMerge(rowClass, inactiveClass, "group")}
  >
    <props.icon size={16} className="flex-none" />
    <span className="min-w-0 flex-1 truncate">{props.title}</span>
    <ArrowUpRight
      size={13}
      className="flex-none text-faint transition-colors group-hover:text-muted"
      aria-hidden
    />
  </ExternalLink>
);

export default function Sidebar(props: { onSignOut: (domain: string) => void }) {
  const domain = useAppSelector((state) => state.daemon.selectedDomain);
  const state = useDomainState(domain);
  const authenticated = isAuthenticated(state);

  return (
    <aside className="flex w-[248px] flex-none flex-col border-r border-line bg-app">
      <div className="flex-none p-3">
        <DomainSwitcher />
      </div>

      <nav
        aria-label="Application navigation"
        className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-3 pt-1 pb-3"
      >
        <div className="flex flex-col gap-0.5">
          {authenticated ? (
            <>
              <NavItem to="/connection" title="Connection" icon={Activity} />
              <NavItem to="/services" title="Services" icon={PanelTop} />
              <NavItem to="/namespaces" title="Namespaces" icon={Boxes} />
            </>
          ) : (
            <NavItem to="/connection" title="Sign in" icon={LogIn} />
          )}
          <NavItem to="/settings" title="Settings" icon={SettingsIcon} />
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="mb-1 px-2.5 text-micro font-medium tracking-[0.06em] text-faint uppercase">
            Resources
          </span>
          <ResourceLink
            href="https://octelium.com/docs"
            title="Documentation"
            icon={BookOpen}
          />
          <ResourceLink
            href="https://github.com/octelium/octelium"
            title="GitHub"
            icon={LuGithub}
          />
        </div>
      </nav>

      <div className="flex flex-none flex-col gap-0.5 border-t border-line p-3">
        <NavItem to="/diagnostics" title="Diagnostics" icon={Stethoscope} />
        {authenticated && domain && (
          <button
            type="button"
            className={twMerge(
              rowClass,
              "text-left text-body hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-500/10 dark:hover:text-rose-300",
            )}
            onClick={() => props.onSignOut(domain)}
          >
            <LogOut size={16} strokeWidth={1.75} className="flex-none" aria-hidden />
            <span className="truncate">Sign out</span>
          </button>
        )}
        <div className="mt-2 px-2.5 text-micro text-faint">
          Octelium Desktop {currentAppVersion ?? "development build"}
        </div>
      </div>
    </aside>
  );
}
