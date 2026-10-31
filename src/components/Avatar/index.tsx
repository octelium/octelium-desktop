import { getInitials } from "@/utils";
import { UserRound } from "lucide-react";
import { useState } from "react";
import { twMerge } from "@/utils/tailwind";

const SIZES = {
  xs: "h-6 w-6 text-[0.5625rem]",
  sm: "h-7 w-7 text-[0.625rem]",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-sm",
};

const Avatar = (props: {
  src?: string;
  name?: string;
  size?: keyof typeof SIZES;
  className?: string;
}) => {
  const [failedSrc, setFailedSrc] = useState<string>();
  const initials = getInitials(props.name);
  const showImage = !!props.src && failedSrc !== props.src;

  return (
    <span
      aria-hidden
      className={twMerge(
        "flex flex-none items-center justify-center overflow-hidden rounded-full bg-zinc-700 font-medium text-white ring-1 ring-black/5 dark:bg-zinc-600 dark:ring-white/10",
        SIZES[props.size ?? "md"],
        props.className,
      )}
    >
      {showImage ? (
        <img
          src={props.src}
          alt=""
          referrerPolicy="no-referrer"
          draggable={false}
          onError={() => setFailedSrc(props.src)}
          className="h-full w-full object-cover"
        />
      ) : initials ? (
        initials
      ) : (
        <UserRound size={14} strokeWidth={2} />
      )}
    </span>
  );
};

export default Avatar;
