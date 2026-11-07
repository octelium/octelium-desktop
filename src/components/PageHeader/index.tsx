import type { ReactNode } from "react";

const PageHeader = (props: {
  title: string;
  description?: ReactNode;
  addon?: ReactNode;
  actions?: ReactNode;
}) => (
  <div className="mb-5 flex w-full items-start justify-between gap-4">
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex min-w-0 items-center gap-2">
        <h1 className="truncate text-2xl leading-tight font-semibold tracking-[-0.015em] text-strong">
          {props.title}
        </h1>
        {props.addon}
      </div>
      {props.description && (
        <p className="max-w-2xl text-ui font-normal text-muted">{props.description}</p>
      )}
    </div>
    {props.actions && (
      <div className="flex flex-none flex-wrap items-center justify-end gap-2">
        {props.actions}
      </div>
    )}
  </div>
);

export default PageHeader;
