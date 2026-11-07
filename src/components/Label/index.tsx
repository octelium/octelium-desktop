import { twMerge } from "@/utils/tailwind";

export type LabelTone = "neutral" | "emerald" | "sky" | "amber" | "rose" | "slate";

const TONES: Record<LabelTone, string> = {
  neutral: "border-line bg-surface text-body",
  slate: "border-line bg-surface-2 text-muted",
  emerald:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  sky: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300",
  amber:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  rose: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
};

const DOTS: Record<LabelTone, string> = {
  neutral: "bg-faint",
  slate: "bg-faint",
  emerald: "bg-emerald-500",
  sky: "bg-sky-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
};

const Label = (props: {
  children?: React.ReactNode;
  tone?: LabelTone;
  dot?: boolean;
  className?: string;
}) => {
  const tone = props.tone ?? "neutral";

  return (
    <span
      className={twMerge(
        "inline-flex max-w-full flex-none items-center gap-1.5 rounded-full border px-2 py-0.5",
        "text-micro leading-4 font-semibold whitespace-nowrap",
        TONES[tone],
        props.className,
      )}
    >
      {props.dot && (
        <span
          aria-hidden
          className={twMerge("h-1.5 w-1.5 flex-none rounded-full", DOTS[tone])}
        />
      )}
      {props.children}
    </span>
  );
};

export default Label;
