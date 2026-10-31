import ConfirmModal from "@/components/ConfirmModal";
import { getErrorMessage, logout } from "@/features/daemon/actions";
import { useMutation } from "@tanstack/react-query";
import { LogOut } from "lucide-react";

const SignOutModal = (props: { domain: string; onClose: () => void }) => {
  const mutation = useMutation({
    mutationFn: () => logout(props.domain),
    onSuccess: props.onClose,
  });

  return (
    <ConfirmModal
      opened
      onClose={props.onClose}
      onConfirm={() => mutation.mutate()}
      title="Sign out"
      confirmLabel="Sign out"
      color="red"
      icon={<LogOut size={14} strokeWidth={2.25} aria-hidden />}
      isPending={mutation.isPending}
      error={mutation.isError ? getErrorMessage(mutation.error) : undefined}
    >
      Signing out of <strong className="font-medium text-strong">{props.domain}</strong>{" "}
      disconnects the Cluster, invalidates the Session and removes the stored
      credentials of this machine.
    </ConfirmModal>
  );
};

export default SignOutModal;
