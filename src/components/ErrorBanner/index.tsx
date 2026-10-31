import Notice from "@/components/Notice";
import { Error_Code, type Error as DaemonError } from "@/gen/client/daemonv1";
import { getErrorHint, getErrorTitle, isErrorRetryable } from "@/utils/daemon";
import { Button } from "@mantine/core";
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
  const retry = props.onRetry && isErrorRetryable(props.error);

  return (
    <Notice
      tone="rose"
      className="mb-4"
      icon={<AlertTriangle size={15} aria-hidden />}
      title={getErrorTitle(props.error)}
      actions={
        (signIn || retry) && (
          <Button
            size="xs"
            variant="default"
            loading={props.isPending}
            disabled={props.disabled}
            leftSection={
              signIn ? (
                <LogIn size={13} aria-hidden />
              ) : (
                <RefreshCw size={13} aria-hidden />
              )
            }
            onClick={signIn || props.onRetry}
          >
            {signIn ? "Sign in again" : "Try again"}
          </Button>
        )
      }
    >
      {(hint || props.error.message) && (
        <>
          {hint && <div>{hint}</div>}
          {props.error.message && (
            <div className="mt-0.5 font-mono text-[11.5px] break-all opacity-80" data-selectable>
              {props.error.message}
            </div>
          )}
        </>
      )}
    </Notice>
  );
};

export default ErrorBanner;
