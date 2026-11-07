import { twMerge } from "@/utils/tailwind";
import { Loader } from "@mantine/core";
import type { LucideIcon } from "lucide-react";

const ActionButton = (props: {
  label: string;
  Icon: LucideIcon;
  quiet?: boolean;
  pending?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) => (
  <button
    type="button"
    disabled={props.disabled}
    aria-busy={props.pending}
    className={twMerge(
      "grid w-full grid-cols-[1.25rem_minmax(0,1fr)_1.25rem] items-center gap-2 rounded-lg border border-brand bg-brand px-3 py-3.5 font-bold text-brand-fg shadow-button transition-[background-color,border-color,box-shadow] duration-500 not-disabled:hover:border-brand-hover not-disabled:hover:bg-brand-hover not-disabled:hover:shadow-button-hover disabled:shadow-none",
      "dark:border-line dark:bg-surface dark:text-strong dark:not-disabled:hover:border-line-strong dark:not-disabled:hover:bg-surface-2",
      props.quiet &&
        "border-line-strong bg-surface text-strong shadow-none not-disabled:hover:border-faint not-disabled:hover:bg-surface-2 not-disabled:hover:shadow-none dark:bg-transparent",
      props.disabled && !props.pending && "opacity-50",
    )}
    onClick={props.onClick}
  >
    <span className="flex items-center justify-center">
      {props.pending ? (
        <Loader size={16} color="currentColor" aria-hidden />
      ) : (
        <props.Icon size={18} aria-hidden />
      )}
    </span>
    <span className="min-w-0 break-words text-center">{props.label}</span>
  </button>
);

export default ActionButton;
