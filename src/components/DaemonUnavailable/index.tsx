import { Card } from "@/components/Card";
import CopyText from "@/components/CopyText";
import Notice from "@/components/Notice";
import { useAppSelector } from "@/utils/hooks";
import { Loader2, ServerCrash, ShieldAlert } from "lucide-react";
import { twMerge } from "@/utils/tailwind";

const COMMANDS: Record<string, string> = {
  windows: "Start-Service OcteliumDaemon",
  linux: "sudo systemctl start octelium-desktop-daemon.service",
  macos: "sudo launchctl kickstart -k system/com.octelium.desktop.daemon",
};

const DaemonUnavailable = (props: { platform?: string; compact?: boolean }) => {
  const availability = useAppSelector((state) => state.daemon.availability);
  const error = useAppSelector((state) => state.daemon.error);
  const command = COMMANDS[props.platform ?? ""];
  const checking = availability === "unknown";
  const title = checking
    ? "Checking the Octelium daemon"
    : availability === "incompatible"
      ? "The Octelium daemon is incompatible"
      : "The Octelium daemon is not running";
  const description = checking
    ? "The application is waiting for the local daemon to respond."
    : availability === "incompatible"
      ? "Update both the Octelium desktop application and the Octelium daemon to the same release."
      : "Start the privileged Octelium daemon and this application reconnects on its own.";

  if (props.compact) {
    return (
      <Notice
        tone={checking ? "neutral" : "rose"}
        className="mb-4"
        icon={
          checking ? (
            <Loader2 size={15} className="animate-spin" aria-hidden />
          ) : (
            <ShieldAlert size={15} aria-hidden />
          )
        }
        title={title}
      >
        {description}
      </Notice>
    );
  }

  return (
    <div className="flex min-h-full w-full items-center justify-center p-6">
      <Card className="w-full max-w-lg animate-page-in p-6">
        <div
          className={twMerge(
            "mb-4 flex h-10 w-10 items-center justify-center rounded-xl border",
            checking
              ? "border-line bg-surface-2 text-muted"
              : "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
          )}
        >
          {checking ? (
            <Loader2 size={18} className="animate-spin" aria-hidden />
          ) : (
            <ServerCrash size={18} aria-hidden />
          )}
        </div>

        <h1 className="text-base font-bold tracking-tight text-strong">
          {title}
        </h1>

        <p className="mt-1 text-ui text-muted">{description}</p>

        {availability === "unavailable" && command && (
          <div className="mt-5">
            <div className="mb-1.5 text-micro font-medium tracking-[0.06em] text-muted uppercase">
              Start it manually
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface-2 py-1.5 pr-1.5 pl-3">
              <code className="min-w-0 font-mono text-xs break-all text-strong" data-selectable>
                {command}
              </code>
              <CopyText value={command} label="Copy the command" hide />
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-line bg-surface-2 px-3 py-2">
            <div className="text-micro font-medium tracking-[0.06em] text-muted uppercase">
              Details
            </div>
            <div className="mt-1 font-mono text-xs break-all text-body" data-selectable>
              {error}
            </div>
          </div>
        )}

        {!checking && (
          <div className="mt-5 flex items-center gap-2 text-xs text-muted">
            <Loader2 size={13} className="animate-spin" aria-hidden />
            Retrying automatically
          </div>
        )}
      </Card>
    </div>
  );
};

export default DaemonUnavailable;
