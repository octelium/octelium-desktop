import { twMerge } from "@/utils/tailwind";
import { Select, type SelectProps } from "@mantine/core";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { filterInputStyles } from "./styles";

export const FilterBar = (props: { label: string; children: ReactNode }) => (
  <div className="sticky top-0 z-20 -mx-1 mb-2 bg-app px-1 pt-3 pb-3">
    <div
      role="search"
      aria-label={props.label}
      className="flex flex-col divide-y divide-line-subtle overflow-hidden rounded-xl border border-line bg-surface shadow-surface transition-[border-color] duration-150 focus-within:border-faint lg:flex-row lg:divide-x lg:divide-y-0"
    >
      {props.children}
    </div>
  </div>
);

export const FilterSelect = (
  props: SelectProps & { clearLabel: string; onClear: () => void },
) => {
  const { clearLabel, onClear, className, ...rest } = props;

  return (
    <Select
      {...rest}
      className={twMerge(
        "min-w-0 transition-colors focus-within:bg-surface-2 hover:bg-surface-2 lg:w-56",
        className,
      )}
      styles={filterInputStyles}
      rightSectionPointerEvents={props.value ? "all" : "none"}
      rightSection={
        props.value ? (
          <button
            type="button"
            aria-label={clearLabel}
            title={clearLabel}
            className="flex h-6 w-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-3 hover:text-strong"
            onClick={onClear}
          >
            <X size={14} strokeWidth={2.4} aria-hidden />
          </button>
        ) : undefined
      }
    />
  );
};

export const FilterClearButton = (props: { onClick: () => void }) => (
  <button
    type="button"
    className="flex min-h-[42px] flex-none items-center justify-center gap-1.5 px-3.5 text-xs font-semibold whitespace-nowrap text-body outline-none transition-colors hover:bg-surface-2 hover:text-strong focus-visible:bg-surface-2 focus-visible:text-strong"
    onClick={props.onClick}
  >
    <X size={13} strokeWidth={2.5} aria-hidden />
    Clear filters
  </button>
);
