import { Card } from "@/components/Card";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { twMerge } from "@/utils/tailwind";

export const ResourceListWrapper = (props: { children?: ReactNode }) => {
  return <ul className="m-0 flex w-full list-none flex-col gap-2 p-0">{props.children}</ul>;
};

export const ResourceListItem = (props: {
  children?: ReactNode;
  className?: string;
}) => {
  return (
    <li>
      <Card interactive className={twMerge("group/item", props.className)}>
        {props.children}
      </Card>
    </li>
  );
};

export const ResourceListLabelWrap = (props: {
  children?: ReactNode;
  className?: string;
}) => (
  <div
    className={twMerge(
      "flex w-full flex-wrap items-center gap-1.5",
      props.className,
    )}
  >
    {props.children}
  </div>
);

export const ResourceListLabel = (props: {
  children?: ReactNode;
  label?: string;
  icon?: ReactNode;
  to?: string;
  title?: string;
}) => {
  const content = (
    <span
      className={twMerge(
        "inline-flex min-h-6 max-w-full items-center gap-1.5 rounded-md border px-2 py-0.5 align-middle",
        "border-line bg-surface-2 text-xs leading-4 text-body",
        "transition-[background-color,border-color,color] duration-150",
        "[&_svg]:size-3 [&_svg]:flex-none [&_svg]:text-muted",
        props.to &&
          "group-hover/label:border-sky-200 group-hover/label:bg-sky-50 group-hover/label:text-sky-700 dark:group-hover/label:border-sky-500/30 dark:group-hover/label:bg-sky-500/10 dark:group-hover/label:text-sky-300",
      )}
    >
      {props.icon}
      {props.label && (
        <>
          <span className="flex-none font-medium text-muted">
            {props.label}
            <span className="sr-only">: </span>
          </span>
          <span aria-hidden className="h-3 w-px flex-none bg-line" />
        </>
      )}
      <span className="min-w-0 truncate">{props.children}</span>
    </span>
  );

  return props.to ? (
    <Link
      to={props.to}
      title={props.title}
      aria-label={props.title}
      onClick={(event) => event.stopPropagation()}
      className="group/label inline-flex max-w-full rounded-md align-middle outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      {content}
    </Link>
  ) : (
    <span title={props.title} className="inline-flex max-w-full">
      {content}
    </span>
  );
};
