import { Error_Code, type Error as DaemonError } from "@/gen/client/daemonv1";
import { getErrorHint, getErrorTitle, isErrorRetryable } from "@/utils/daemon";
import { Alert, Button } from "@mantine/core";
import { AlertTriangle, LogIn, RefreshCw } from "lucide-react";

const ErrorBanner = (props: {
  error?: DaemonError;
  onRetry?: () => void;
  onSignIn?: () => void;
  isPending?: boolean;
  disabled?: boolean;
}) => {
  if (!props.error) {
    return null;
  }

  const hint = getErrorHint(props.error);
  const signIn =
    props.error.code === Error_Code.AUTHENTICATION_REQUIRED && props.onSignIn;

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
        {(signIn || (props.onRetry && isErrorRetryable(props.error))) && (
          <div>
            <Button
              color="red"
              size="xs"
              variant="outline"
              loading={props.isPending}
              disabled={props.disabled}
              leftSection={
                signIn ? (
                  <LogIn size={14} aria-hidden />
                ) : (
                  <RefreshCw size={14} aria-hidden />
                )
              }
              onClick={signIn || props.onRetry}
            >
              {signIn ? "Sign in again" : "Try again"}
            </Button>
          </div>
        )}
      </div>
    </Alert>
  );
};

export default ErrorBanner;
