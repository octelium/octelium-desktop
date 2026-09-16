import type { Error as DaemonError } from "@/gen/client/daemonv1";
import { getErrorHint, getErrorTitle, isErrorRetryable } from "@/utils/daemon";
import { Alert, Button } from "@mantine/core";
import { AlertTriangle, RefreshCw } from "lucide-react";

const ErrorBanner = (props: {
  error?: DaemonError;
  onRetry?: () => void;
  isPending?: boolean;
}) => {
  if (!props.error) {
    return null;
  }

  const hint = getErrorHint(props.error);

  return (
    <Alert
      color="red"
      radius="md"
      icon={<AlertTriangle size={18} aria-hidden />}
      title={getErrorTitle(props.error)}
      className="mb-6"
    >
      <div className="flex flex-col gap-2">
        {hint && <span className="text-sm font-semibold">{hint}</span>}
        {props.error.message && (
          <span className="font-mono text-[12px] break-all opacity-80" data-selectable>
            {props.error.message}
          </span>
        )}
        {props.onRetry && isErrorRetryable(props.error) && (
          <div>
            <Button
              color="red"
              size="xs"
              variant="outline"
              loading={props.isPending}
              leftSection={<RefreshCw size={14} aria-hidden />}
              onClick={props.onRetry}
            >
              Try again
            </Button>
          </div>
        )}
      </div>
    </Alert>
  );
};

export default ErrorBanner;
