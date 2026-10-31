import type { ReactNode } from "react";
import { twMerge } from "@/utils/tailwind";

export type NoticeTone = "neutral" | "sky" | "emerald" | "amber" | "rose";

const TONES: Record<NoticeTone, string> = {
  neutral: "border-line bg-surface-2 text-body",
  sky: "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-100",
  emerald:
    "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-100",
  amber:
    "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100",
  rose: "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-100",
};

const ICONS: Record<NoticeTone, string> = {
  neutral: "text-muted",
  sky: "text-sky-600 dark:text-sky-300",
  emerald: "text-emerald-600 dark:text-emerald-300",
  amber: "text-amber-600 dark:text-amber-300",
  rose: "text-rose-600 dark:text-rose-300",
};

const Notice = (props: {
  title?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  tone?: NoticeTone;
  actions?: ReactNode;
  className?: string;
}) => {
  const tone = props.tone ?? "neutral";

  return (
    <div
      role={tone === "rose" ? "alert" : undefined}
      className={twMerge(
        "flex w-full items-start gap-2.5 rounded-xl border px-3.5 py-3",
        TONES[tone],
        props.className,
      )}
    >
      {props.icon && (
        <span className={twMerge("mt-0.5 flex-none", ICONS[tone])}>
          {props.icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        {props.title && (
          <div className="text-ui font-medium">{props.title}</div>
        )}
        {props.children && (
          <div
            className={twMerge(
              "text-xs leading-5 opacity-90",
              props.title && "mt-0.5",
            )}
          >
            {props.children}
          </div>
        )}
        {props.actions && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {props.actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notice;
