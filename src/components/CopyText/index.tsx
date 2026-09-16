import { truncateUtf8 } from "@/utils";
import { CheckCheck, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const CopyText = (props: {
  value?: string;
  truncate?: number;
  hide?: boolean;
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

  const copied = copyState === "copied";

  return (
    <span className="flex items-center justify-start">
      {!hide && (
        <span className="mx-1" data-selectable>
          {props.truncate && props.truncate > 0
            ? `${truncateUtf8(value, props.truncate, { suffix: "..." })}`
            : `${value}`}
        </span>
      )}
      <button
        type="button"
        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-body transition-colors hover:bg-surface-3 hover:text-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-500"
        aria-label={copied ? "Copied" : "Copy to clipboard"}
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
        {copied ? (
          <CheckCheck size={15} className="text-emerald-500" aria-hidden />
        ) : (
          <Copy size={15} aria-hidden />
        )}
      </button>
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
