import type { MouseEventHandler } from "react";
import { twMerge } from "tailwind-merge";
import Label, { type LabelTone } from "../Label";

export const ResourceListWrapper = (props: { children?: React.ReactNode }) => {
  return <div className="flex w-full flex-col gap-2.5">{props.children}</div>;
};

export const ResourceListItem = (props: {
  children?: React.ReactNode;
  className?: string;
  onClick?: MouseEventHandler<HTMLElement>;
}) => {
  return (
    <article
      className={twMerge(
        "group/item relative w-full rounded-xl border border-line bg-surface p-4",
        "shadow-xs transition-all duration-500",
        "hover:border-line-strong hover:bg-surface-2 hover:shadow-md hover:shadow-slate-900/5",
        "focus-within:border-line-strong",
        props.className,
      )}
      onClick={props.onClick}
    >
      {props.children}
    </article>
  );
};

export const ResourceListLabel = (props: {
  children?: React.ReactNode;
  label?: string;
  title?: string;
  tone?: LabelTone;
  className?: string;
  icon?: React.ReactNode;
}) => {
  return (
    <span title={props.title}>
      <Label tone={props.tone} className={props.className}>
        {props.icon && (
          <span className="flex items-center opacity-70">{props.icon}</span>
        )}
        {props.label && (
          <span className="font-medium text-faint">{props.label}</span>
        )}
        <span className="flex min-w-0 items-center">{props.children}</span>
      </Label>
    </span>
  );
};
