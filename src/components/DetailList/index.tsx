import CopyText from "@/components/CopyText";
import ExternalLink from "@/components/ExternalLink";
import { twMerge } from "@/utils/tailwind";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

export const DetailList = (props: {
  children?: ReactNode;
  className?: string;
}) => (
  <div
    className={twMerge(
      "@container min-w-0 overflow-hidden rounded-lg border border-line shadow-card",
      props.className,
    )}
  >
    <dl className="m-0 grid grid-cols-1 gap-px bg-line-subtle @4xl:grid-cols-2">
      {props.children}
    </dl>
  </div>
);

export const DetailRow = (props: {
  label: string;
  children?: ReactNode;
  full?: boolean;
}) => (
  <div
    className={twMerge(
      "grid min-w-0 grid-cols-1 gap-x-4 bg-surface py-2 pr-2 pl-4 transition-colors hover:bg-surface-2 @md:grid-cols-[8rem_minmax(0,1fr)]",
      props.full && "@4xl:col-span-2",
    )}
  >
    <dt className="text-xs leading-5 font-normal text-muted @md:leading-7">
      {props.label}
    </dt>
    <dd className="m-0 flex min-w-0 flex-col gap-1">{props.children}</dd>
  </div>
);

export const DetailValue = (props: {
  value: string;
  copyLabel: string;
  href?: string;
}) => (
  <div className="flex min-h-7 min-w-0 items-center gap-2">
    {props.href ? (
      <ExternalLink
        href={props.href}
        className="min-w-0 rounded font-mono text-ui text-blue-700 underline-offset-2 [overflow-wrap:anywhere] hover:underline dark:text-blue-300"
      >
        {props.value}
        <ArrowUpRight
          size={13}
          strokeWidth={2.25}
          aria-hidden
          className="ml-0.5 inline-block align-[-0.125em]"
        />
      </ExternalLink>
    ) : (
      <span
        className="min-w-0 font-mono text-ui text-body [overflow-wrap:anywhere]"
        data-selectable
      >
        {props.value}
      </span>
    )}
    <CopyText
      value={props.value}
      label={props.copyLabel}
      hide
      className="ml-auto flex-none"
    />
  </div>
);
