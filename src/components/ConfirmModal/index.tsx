import { Button, Modal } from "@mantine/core";
import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

const ConfirmModal = (props: {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children?: ReactNode;
  confirmLabel?: string;
  color?: string;
  icon?: ReactNode;
  isPending?: boolean;
  error?: string;
}) => {
  return (
    <Modal
      opened={props.opened}
      onClose={props.onClose}
      centered
      withCloseButton={false}
      padding={0}
      size="sm"
      closeOnEscape={!props.isPending}
      closeOnClickOutside={!props.isPending}
    >
      <div className="flex flex-col">
        <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-5 py-3.5">
          {props.icon && (
            <span
              className={
                props.color === "red"
                  ? "flex-none text-rose-500"
                  : "flex-none text-muted"
              }
            >
              {props.icon}
            </span>
          )}
          <Modal.Title className="text-ui font-medium text-strong">
            {props.title}
          </Modal.Title>
        </div>

        <div className="flex flex-col gap-3 px-5 py-4">
          <div className="text-ui leading-5 text-body">{props.children}</div>
          {props.error && (
            <p
              role="alert"
              className="m-0 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
            >
              <AlertCircle size={14} className="mt-px flex-none" aria-hidden />
              {props.error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3">
          <Button
            variant="default"
            size="sm"
            disabled={props.isPending}
            onClick={props.onClose}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            color={props.color}
            loading={props.isPending}
            onClick={props.onConfirm}
            data-autofocus
          >
            {props.confirmLabel ?? "Confirm"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
