import type { ConnectivityTone } from "@/utils/daemon";
import { twMerge } from "@/utils/tailwind";

const TONES: Record<ConnectivityTone, string> = {
  connected: "bg-emerald-500",
  pending: "bg-amber-500",
  idle: "bg-slate-400 dark:bg-zinc-500",
  error: "bg-rose-500",
};

const StatusDot = (props: {
  tone: ConnectivityTone;
  pulse?: boolean;
  size?: number;
  className?: string;
}) => {
  const size = props.size ?? 8;

  return (
    <span
      className={twMerge("relative inline-flex flex-none", props.className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {props.pulse && (
        <span
          className={twMerge(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
            TONES[props.tone],
          )}
        />
      )}
      <span
        className={twMerge(
          "relative inline-flex h-full w-full rounded-full",
          TONES[props.tone],
          props.tone === "connected" && !props.pulse && "animate-pulse-ring",
        )}
      />
    </span>
  );
};

export default StatusDot;
