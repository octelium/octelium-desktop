import type { ReactNode } from "react";
import { twMerge } from "@/utils/tailwind";

export const Card = (props: {
  children?: ReactNode;
  className?: string;
  interactive?: boolean;
}) => (
  <div
    className={twMerge(
      "rounded-xl border border-line bg-surface shadow-card",
      props.interactive &&
        "transition-[border-color,box-shadow] duration-150 hover:border-line-strong hover:shadow-raised",
      props.className,
    )}
  >
    {props.children}
  </div>
);

export const IconTile = (props: {
  children?: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}) => (
  <div
    aria-hidden
    className={twMerge(
      "flex flex-none items-center justify-center border border-line bg-surface-2 text-muted",
      props.size === "lg"
        ? "h-10 w-10 rounded-xl"
        : props.size === "sm"
          ? "h-7 w-7 rounded-md"
          : "h-9 w-9 rounded-lg",
      props.className,
    )}
  >
    {props.children}
  </div>
);

export const SectionCard = (props: {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
}) => (
  <section
    className={twMerge(
      "min-w-0 rounded-xl border border-line bg-surface shadow-card",
      props.className,
    )}
  >
    <header className="flex min-h-[52px] items-center justify-between gap-3 border-b border-line-subtle px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        {props.icon && <IconTile size="sm">{props.icon}</IconTile>}
        <div className="min-w-0">
          <h2 className="truncate text-ui font-medium text-strong">
            {props.title}
          </h2>
          {props.description && (
            <p className="truncate text-micro text-muted">
              {props.description}
            </p>
          )}
        </div>
      </div>
      {props.actions && (
        <div className="flex flex-none items-center gap-2">{props.actions}</div>
      )}
    </header>
    <div className={twMerge("p-4", props.bodyClassName)}>{props.children}</div>
  </section>
);

export default Card;
