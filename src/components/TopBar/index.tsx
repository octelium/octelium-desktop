/// <reference types="vite-plugin-svgr/client" />

import Wordmark from "@/assets/wordmark.svg?react";
import ThemeToggle from "@/components/ThemeToggle";
import StatusDot from "@/components/StatusDot";
import { useAppSelector } from "@/utils/hooks";
import { Tooltip } from "@mantine/core";

const TopBar = () => {
  const availability = useAppSelector((state) => state.daemon.availability);
  const info = useAppSelector((state) => state.daemon.info);

  return (
    <nav className="flex h-[60px] w-full items-center px-4">
      <div className="flex flex-none items-center justify-center text-strong">
        <Wordmark className="h-auto w-36" aria-label="Octelium" />
      </div>

      <div className="flex-grow" />

      <div className="flex flex-none items-center gap-3">
        <Tooltip
          label={
            availability === "available"
              ? `Octelium daemon ${info?.version ?? ""}`.trim()
              : "The Octelium daemon is not reachable"
          }
        >
          <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5">
            <StatusDot
              tone={availability === "available" ? "connected" : "error"}
              size={8}
            />
            <span className="text-[11px] font-bold tracking-wide text-muted uppercase">
              Daemon
            </span>
          </div>
        </Tooltip>

        <ThemeToggle />
      </div>
    </nav>
  );
};

export default TopBar;
