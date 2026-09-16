import { cancelOperation, getErrorMessage } from "@/features/daemon/actions";
import { Operation_State, type Operation } from "@/gen/client/daemonv1";
import { getOperationTypeLabel, getPendingOpenURL } from "@/utils/daemon";
import { openExternal } from "@/utils/native";
import { Alert, Button, Loader } from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";

const OperationBanner = (props: { operation?: Operation }) => {
  const op = props.operation;

  const mutationCancel = useMutation({
    mutationFn: async (id: string) => {
      await cancelOperation(id);
    },
  });

  const mutationOpen = useMutation({
    mutationFn: openExternal,
  });

  if (!op) {
    return null;
  }

  const url =
    op.state === Operation_State.WAITING_FOR_USER
      ? getPendingOpenURL({ domain: op.domain, lastOperation: op })
      : undefined;

  return (
    <Alert
      color="blue"
      radius="md"
      className="mb-6"
      icon={<Loader size="xs" />}
      title={`${getOperationTypeLabel(op.type)} ${op.domain}`}
    >
      <div className="flex flex-col gap-3">
        {url && (
          <span className="text-sm font-semibold">
            Finish signing in using your web browser. The browser window opens
            the Cluster Portal at your identity provider.
          </span>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {url && (
            <Button
              size="xs"
              leftSection={<ExternalLink size={14} aria-hidden />}
              loading={mutationOpen.isPending}
              onClick={() => mutationOpen.mutate(url)}
            >
              Open the browser again
            </Button>
          )}
          {op.cancellable && (
            <Button
              size="xs"
              variant="outline"
              loading={mutationCancel.isPending}
              onClick={() => mutationCancel.mutate(op.id)}
            >
              Cancel
            </Button>
          )}
        </div>

        {(mutationOpen.isError || mutationCancel.isError) && (
          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
            {getErrorMessage(mutationOpen.error ?? mutationCancel.error)}
          </span>
        )}
      </div>
    </Alert>
  );
};

export default OperationBanner;
