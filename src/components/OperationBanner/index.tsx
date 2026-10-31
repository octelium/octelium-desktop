import Notice from "@/components/Notice";
import { cancelOperation, getErrorMessage } from "@/features/daemon/actions";
import {
  Operation_State,
  Operation_Type,
  type Operation,
} from "@/gen/client/daemonv1";
import { getOperationTypeLabel, getPendingOpenURL } from "@/utils/daemon";
import { openExternal } from "@/utils/native";
import { Button } from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { ExternalLink, Loader2, X } from "lucide-react";

const PREPOSITIONS: Partial<Record<Operation_Type, string>> = {
  [Operation_Type.AUTHENTICATE]: "to",
  [Operation_Type.CONNECT]: "to",
  [Operation_Type.DISCONNECT]: "from",
  [Operation_Type.LOGOUT]: "of",
};

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
    <Notice
      tone="sky"
      className="mb-4"
      icon={<Loader2 size={15} className="animate-spin" aria-hidden />}
      title={[getOperationTypeLabel(op.type), PREPOSITIONS[op.type], op.domain]
        .filter(Boolean)
        .join(" ")}
      actions={
        (url || op.cancellable) && (
          <>
            {url && (
              <Button
                size="xs"
                leftSection={<ExternalLink size={13} aria-hidden />}
                loading={mutationOpen.isPending}
                onClick={() => mutationOpen.mutate(url)}
              >
                Open the browser again
              </Button>
            )}
            {op.cancellable && (
              <Button
                size="xs"
                variant="default"
                leftSection={<X size={13} aria-hidden />}
                loading={mutationCancel.isPending}
                onClick={() => mutationCancel.mutate(op.id)}
              >
                Cancel
              </Button>
            )}
          </>
        )
      }
    >
      {url
        ? "Finish signing in using your web browser. The browser window opens the Cluster Portal at your identity provider."
        : "This usually takes a few seconds."}
      {(mutationOpen.isError || mutationCancel.isError) && (
        <div className="mt-1 font-medium text-rose-700 dark:text-rose-300">
          {getErrorMessage(mutationOpen.error ?? mutationCancel.error)}
        </div>
      )}
    </Notice>
  );
};

export default OperationBanner;
