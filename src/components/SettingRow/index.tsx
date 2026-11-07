import type { ReactNode } from "react";
import { twMerge } from "@/utils/tailwind";

const SettingRow = (props: {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}) => (
  <div
    className={twMerge(
      "flex flex-col gap-3 border-b border-line-subtle py-3.5 first:pt-0 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6",
      props.className,
    )}
  >
    <div className="min-w-0">
      <div className="text-ui font-semibold text-strong">{props.title}</div>
      {props.description && (
        <div className="mt-0.5 text-xs leading-5 text-muted">
          {props.description}
        </div>
      )}
    </div>
    <div className="flex flex-none items-center">{props.children}</div>
  </div>
);

export default SettingRow;
