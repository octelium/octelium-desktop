import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

const Notice = (props: {
  title?: string;
  children?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={twMerge(
        "flex w-full items-start gap-3 rounded-lg border border-line bg-surface-2 px-4 py-3",
        props.className,
      )}
    >
      {props.icon && (
        <span className="mt-0.5 flex-none text-faint">{props.icon}</span>
      )}
      <div className="min-w-0">
        {props.title && (
          <div className="text-sm font-bold text-strong">{props.title}</div>
        )}
        <div className="mt-0.5 text-sm font-medium text-muted">
          {props.children}
        </div>
      </div>
    </div>
  );
};

export default Notice;
