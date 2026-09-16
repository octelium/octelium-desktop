import { openExternal } from "@/utils/native";
import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

const ExternalLink = (props: {
  href: string;
  children?: ReactNode;
  className?: string;
  title?: string;
}) => {
  return (
    <a
      href={props.href}
      title={props.title}
      className={twMerge("cursor-pointer", props.className)}
      onClick={(event) => {
        event.preventDefault();
        void openExternal(props.href).catch(() => {});
      }}
    >
      {props.children}
    </a>
  );
};

export default ExternalLink;
