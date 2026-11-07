import * as React from "react";
import { twMerge } from "@/utils/tailwind";

export const InfoGrid = (props: {
  children?: React.ReactNode;
  className?: string;
}) => (
  <dl
    className={twMerge(
      "m-0 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3",
      props.className,
    )}
  >
    {props.children}
  </dl>
);

export const InfoItem = (props: {
  children?: React.ReactNode;
  title: string;
  className?: string;
}) => {
  return (
    <div className={twMerge("min-w-0 text-left", props.className)}>
      <dt className="text-xs font-normal text-muted">
        {props.title}
      </dt>
      <dd className="m-0 mt-0.5 min-w-0 text-ui font-medium break-words text-strong">
        {props.children}
      </dd>
    </div>
  );
};

export default InfoItem;
