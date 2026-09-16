import { Alert, Button, Modal } from "@mantine/core";
import type { ReactNode } from "react";

const ConfirmModal = (props: {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children?: ReactNode;
  confirmLabel?: string;
  color?: string;
  isPending?: boolean;
  error?: string;
}) => {
  return (
    <Modal opened={props.opened} onClose={props.onClose} centered title={props.title}>
      <div className="text-sm font-medium text-body">{props.children}</div>

      {props.error && (
        <Alert className="mt-4" color="red" title="The operation failed">
          {props.error}
        </Alert>
      )}

      <div className="mt-6 flex items-center justify-end gap-3">
        <Button variant="outline" onClick={props.onClose}>
          Cancel
        </Button>
        <Button
          color={props.color}
          loading={props.isPending}
          onClick={props.onConfirm}
          autoFocus
        >
          {props.confirmLabel ?? "Confirm"}
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
