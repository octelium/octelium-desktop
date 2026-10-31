import { truncateUtf8 } from "@/utils";
import { ActionIcon, Tooltip } from "@mantine/core";
import { Check, Copy, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { twMerge } from "@/utils/tailwind";

const CopyText = (props: {
  value?: string;
  truncate?: number;
  hide?: boolean;
  label?: string;
  mono?: boolean;
  className?: string;
}) => {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const timeoutRef = useRef<number | undefined>(undefined);
  const { value, hide } = props;

  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  if (!value) {
    return <></>;
  }

  const label =
    copyState === "copied"
      ? "Copied"
      : copyState === "error"
        ? "Could not copy"
        : (props.label ?? "Copy");

  return (
    <span
      className={twMerge(
        "inline-flex max-w-full min-w-0 items-center gap-1",
        props.className,
      )}
    >
      {!hide && (
        <span
          className={twMerge(
            "min-w-0 [overflow-wrap:anywhere]",
            props.mono !== false && "font-mono text-xs font-medium",
          )}
          data-selectable
        >
          {props.truncate && props.truncate > 0
            ? `${truncateUtf8(value, props.truncate, { suffix: "..." })}`
            : `${value}`}
        </span>
      )}
      <Tooltip label={label} withArrow openDelay={0}>
        <ActionIcon
          size={24}
          radius="md"
          aria-label={label}
          className="flex-none text-faint hover:text-strong"
          onClick={async (e) => {
            e.stopPropagation();
            e.preventDefault();
            try {
              if (!navigator.clipboard) throw new Error("Clipboard unavailable");
              await navigator.clipboard.writeText(value);
              setCopyState("copied");
            } catch {
              setCopyState("error");
            }
            window.clearTimeout(timeoutRef.current);
            timeoutRef.current = window.setTimeout(
              () => setCopyState("idle"),
              1200,
            );
          }}
        >
          {copyState === "copied" ? (
            <Check size={13} strokeWidth={2.5} className="text-emerald-500" aria-hidden />
          ) : copyState === "error" ? (
            <X size={13} strokeWidth={2.5} className="text-rose-500" aria-hidden />
          ) : (
            <Copy size={13} strokeWidth={2.25} aria-hidden />
          )}
        </ActionIcon>
      </Tooltip>
      <span className="sr-only" aria-live="polite">
        {copyState === "copied"
          ? "Copied to clipboard"
          : copyState === "error"
            ? "Could not copy to clipboard"
            : ""}
      </span>
    </span>
  );
};

export default CopyText;
