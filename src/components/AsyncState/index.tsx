import { Card } from "@/components/Card";
import { Button } from "@mantine/core";
import { AlertCircle, Inbox, Loader2, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

export const LoadingState = (props: { label?: string }) => (
  <div
    className="flex w-full items-center justify-center py-16"
    role="status"
    aria-live="polite"
  >
    <div className="flex items-center gap-2 text-muted">
      <Loader2 size={15} strokeWidth={2.25} className="animate-spin" aria-hidden />
      <span className="text-xs font-medium">{props.label ?? "Loading…"}</span>
    </div>
  </div>
);

export const ResourceListSkeleton = (props: { count?: number }) => (
  <div
    className="flex w-full flex-col gap-2"
    aria-label="Loading resources"
    role="status"
  >
    {Array.from({ length: props.count ?? 5 }, (_, index) => (
      <div
        className="flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3.5 shadow-surface"
        key={index}
      >
        <div className="h-9 w-9 flex-none animate-pulse rounded-lg bg-surface-3" />
        <div className="flex-1 space-y-2.5 pt-1">
          <div className="h-3 w-1/4 animate-pulse rounded bg-surface-3" />
          <div className="flex gap-1.5">
            <div className="h-5 w-16 animate-pulse rounded-md bg-surface-2" />
            <div className="h-5 w-24 animate-pulse rounded-md bg-surface-2" />
            <div className="h-5 w-14 animate-pulse rounded-md bg-surface-2" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const ErrorState = (props: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) => (
  <Card className="px-6 py-10">
    <div
      role="alert"
      className="flex w-full flex-col items-center justify-center text-center"
    >
      <div
        aria-hidden
        className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
      >
        <AlertCircle size={18} strokeWidth={2} />
      </div>
      <p className="text-ui font-semibold text-strong">
        {props.title ?? "Something went wrong"}
      </p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-muted">
        {props.message ?? "This information could not be loaded. Try again."}
      </p>
      {props.onRetry && (
        <Button
          variant="default"
          size="sm"
          className="mt-4"
          leftSection={<RefreshCw size={13} strokeWidth={2.25} />}
          onClick={props.onRetry}
        >
          Try again
        </Button>
      )}
    </div>
  </Card>
);

export const EmptyState = (props: {
  title: string;
  message?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) => (
  <Card className="px-6 py-12">
    <div className="flex w-full flex-col items-center justify-center text-center">
      <div
        aria-hidden
        className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface-2 text-muted"
      >
        {props.icon ?? <Inbox size={18} strokeWidth={2} />}
      </div>
      <h2 className="text-ui font-semibold text-strong">{props.title}</h2>
      {props.message && (
        <p className="mt-1 max-w-sm text-xs leading-5 text-muted">
          {props.message}
        </p>
      )}
      {props.action && <div className="mt-4">{props.action}</div>}
    </div>
  </Card>
);
