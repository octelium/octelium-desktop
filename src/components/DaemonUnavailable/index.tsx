import { useAppSelector } from "@/utils/hooks";
import { Alert, Code } from "@mantine/core";
import { ShieldAlert } from "lucide-react";

const COMMANDS: Record<string, string> = {
  windows: "Start-Service OcteliumDesktopDaemon",
  linux: "sudo systemctl start octelium-desktop-daemon.service",
  macos: "sudo launchctl kickstart -k system/com.octelium.desktop.daemon",
};

const DaemonUnavailable = (props: { platform?: string }) => {
  const availability = useAppSelector((state) => state.daemon.availability);
  const error = useAppSelector((state) => state.daemon.error);

  const command = COMMANDS[props.platform ?? ""];

  return (
    <div className="flex min-h-[calc(100vh-64px)] w-full items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-xl border border-line bg-surface p-8 shadow-sm">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30">
          <ShieldAlert size={22} aria-hidden />
        </div>

        <h1 className="text-xl font-extrabold tracking-tight text-strong">
          {availability === "incompatible"
            ? "The Octelium daemon is incompatible"
            : "The Octelium daemon is not running"}
        </h1>

        <p className="mt-2 text-sm font-medium text-muted">
          {availability === "incompatible"
            ? "Update both the Octelium desktop application and the Octelium daemon to the same release."
            : "Start the privileged Octelium daemon and this application reconnects on its own."}
        </p>

        {availability !== "incompatible" && command && (
          <div className="mt-5">
            <div className="mb-1 text-[11px] font-bold tracking-wide text-faint uppercase">
              Start manually
            </div>
            <Code block data-selectable>
              {command}
            </Code>
          </div>
        )}

        {error && (
          <Alert color="gray" radius="md" className="mt-5" title="Details">
            <span className="font-mono text-[12px] break-all" data-selectable>
              {error}
            </span>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default DaemonUnavailable;
