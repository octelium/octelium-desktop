import { ActionIcon, Tooltip } from "@mantine/core";
import { RefreshCw } from "lucide-react";
import { twMerge } from "@/utils/tailwind";

const RefreshButton = (props: {
  onClick: () => void;
  loading?: boolean;
  label?: string;
}) => {
  const label = props.label ?? "Refresh";

  return (
    <Tooltip label={label}>
      <ActionIcon
        variant="default"
        size={34}
        radius="md"
        aria-label={label}
        aria-busy={props.loading || undefined}
        onClick={props.onClick}
      >
        <RefreshCw
          size={14}
          strokeWidth={2.25}
          aria-hidden
          className={twMerge("text-body", props.loading && "animate-spin")}
        />
      </ActionIcon>
    </Tooltip>
  );
};

export default RefreshButton;
