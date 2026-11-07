/// <reference types="vite-plugin-svgr/client" />

import Mark from "@/assets/mark.svg?react";
import { Card } from "@/components/Card";
import ClusterSignIn from "@/components/ClusterSignIn";
import ConfirmModal from "@/components/ConfirmModal";
import Label from "@/components/Label";
import PageHeader from "@/components/PageHeader";
import StatusDot from "@/components/StatusDot";
import {
  authenticateBrowser,
  connect,
  deleteDomain,
  disconnect,
  getErrorMessage,
  logout,
} from "@/features/daemon/actions";
import { useSelectDomain } from "@/features/daemon/hooks";
import { Operation_State, type DomainState } from "@/gen/client/daemonv1";
import {
  canConnect,
  canDisconnect,
  getAuthenticationStateLabel,
  getAuthenticationStateTone,
  getConnectionStateLabel,
  getConnectionStateTone,
  isAuthenticated,
  isConnected,
  isConnectionBusy,
} from "@/utils/daemon";
import { useAppSelector } from "@/utils/hooks";
import { openExternal } from "@/utils/native";
import { ActionIcon, Button, Menu } from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  Ellipsis,
  LogIn,
  LogOut,
  Plug,
  PlugZap,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const AddCluster = (props: { hasClusters: boolean }) => {
  return (
    <ClusterSignIn
      compact
      title={props.hasClusters ? "Add another Cluster" : "Add a Cluster"}
      description={
        props.hasClusters
          ? "The selected domain becomes the primary Cluster shown throughout the app."
          : "Enter your Cluster domain to sign in and connect this device."
      }
    />
  );
};

const ClusterItem = (props: { item: DomainState }) => {
  const { item } = props;
  const selectDomain = useSelectDomain();
  const navigate = useNavigate();
  const selected = useAppSelector((state) => state.daemon.selectedDomain);
  const primaryDomain = useAppSelector(
    (state) => state.prefs.prefs.primaryDomain,
  );
  const [confirm, setConfirm] = useState<"logout" | "delete" | undefined>(
    undefined,
  );

  const mutation = useMutation({
    mutationFn: async (action: "connect" | "disconnect" | "logout" | "delete") => {
      switch (action) {
        case "connect":
          await connect(item.domain);
          return;
        case "disconnect":
          await disconnect(item.domain);
          return;
        case "logout":
          await logout(item.domain);
          return;
        case "delete":
          await deleteDomain(item.domain);
          return;
      }
    },
    onSuccess: (_, action) => {
      setConfirm(undefined);
      if (action === "delete" && primaryDomain === item.domain) {
        selectDomain(undefined);
      }
    },
  });

  const mutationAuth = useMutation({
    mutationFn: async () => {
      selectDomain(item.domain);
      const op = await authenticateBrowser(item.domain);
      if (
        op.state === Operation_State.WAITING_FOR_USER &&
        op.action?.type.oneofKind === "openURL"
      ) {
        await openExternal(op.action.type.openURL.url);
      }
    },
  });

  return (
    <li>
      <Card interactive>
        <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center">
          <button
            type="button"
            className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-focus"
            onClick={() => {
              selectDomain(item.domain);
              navigate("/connection");
            }}
          >
            <span className="relative flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-line bg-surface-2 text-strong">
              <Mark className="h-5 w-5" aria-hidden />
              <span className="absolute -right-0.5 -bottom-0.5 flex rounded-full bg-surface p-[2px]">
                <StatusDot
                  size={9}
                  tone={getConnectionStateTone(item.connection?.state)}
                  pulse={isConnectionBusy(item)}
                />
              </span>
            </span>
            <span className="min-w-0">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-semibold text-strong">
                  {item.domain}
                </span>
                {item.domain === selected && <Label tone="sky">Selected</Label>}
                <ArrowRight
                  size={13}
                  className="flex-none text-faint opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-1.5">
                <Label
                  tone={getAuthenticationStateTone(item.authentication?.state)}
                  dot
                >
                  {getAuthenticationStateLabel(item.authentication?.state)}
                </Label>
                {isAuthenticated(item) && (
                  <Label
                    tone={isConnected(item) ? "emerald" : "slate"}
                    dot
                  >
                    {getConnectionStateLabel(item.connection?.state)}
                  </Label>
                )}
                {item.settings?.autoConnect && (
                  <Label tone="slate">Auto connect</Label>
                )}
              </span>
            </span>
          </button>

          <div className="flex flex-none items-center gap-1.5">
            {isAuthenticated(item) ? (
              canDisconnect(item) ? (
                <Button
                  size="xs"
                  variant="default"
                  loading={mutation.isPending && mutation.variables === "disconnect"}
                  leftSection={<Plug size={13} aria-hidden />}
                  onClick={() => mutation.mutate("disconnect")}
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  size="xs"
                  disabled={!canConnect(item)}
                  loading={mutation.isPending && mutation.variables === "connect"}
                  leftSection={<PlugZap size={13} aria-hidden />}
                  onClick={() => mutation.mutate("connect")}
                >
                  Connect
                </Button>
              )
            ) : (
              <Button
                size="xs"
                disabled={isConnectionBusy(item) || mutation.isPending}
                loading={mutationAuth.isPending}
                leftSection={<LogIn size={13} aria-hidden />}
                onClick={() => mutationAuth.mutate()}
              >
                Sign in
              </Button>
            )}

            <Menu position="bottom-end" width={180}>
              <Menu.Target>
                <ActionIcon size={30} aria-label={`More actions for ${item.domain}`}>
                  <Ellipsis size={16} aria-hidden />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                {isAuthenticated(item) && (
                  <Menu.Item
                    leftSection={<LogOut size={14} aria-hidden />}
                    onClick={() => setConfirm("logout")}
                  >
                    Sign out
                  </Menu.Item>
                )}
                <Menu.Item
                  color="red"
                  leftSection={<Trash2 size={14} aria-hidden />}
                  onClick={() => setConfirm("delete")}
                >
                  Remove
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </div>
        </div>

        {(mutation.isError || mutationAuth.isError) && confirm === undefined && (
          <div
            role="alert"
            className="border-t border-line-subtle px-4 py-2.5 text-xs font-medium text-rose-700 dark:text-rose-300"
          >
            {getErrorMessage(mutation.error ?? mutationAuth.error)}
          </div>
        )}
      </Card>

      <ConfirmModal
        opened={confirm === "logout"}
        onClose={() => setConfirm(undefined)}
        onConfirm={() => mutation.mutate("logout")}
        title="Sign out"
        confirmLabel="Sign out"
        color="red"
        icon={<LogOut size={14} strokeWidth={2.25} aria-hidden />}
        isPending={mutation.isPending}
        error={mutation.isError ? getErrorMessage(mutation.error) : undefined}
      >
        Signing out of <strong className="font-medium text-strong">{item.domain}</strong>{" "}
        disconnects the Cluster, invalidates the Session and removes the stored
        credentials of this machine.
      </ConfirmModal>

      <ConfirmModal
        opened={confirm === "delete"}
        onClose={() => setConfirm(undefined)}
        onConfirm={() => mutation.mutate("delete")}
        title="Remove the Cluster"
        confirmLabel="Remove"
        color="red"
        icon={<Trash2 size={14} strokeWidth={2.25} aria-hidden />}
        isPending={mutation.isPending}
        error={mutation.isError ? getErrorMessage(mutation.error) : undefined}
      >
        Removing <strong className="font-medium text-strong">{item.domain}</strong>{" "}
        signs out and deletes both the credentials and the locally stored settings
        of the Cluster.
      </ConfirmModal>
    </li>
  );
};

const Clusters = (props: { embedded?: boolean }) => {
  const status = useAppSelector((state) => state.daemon.status);
  const domains = status?.domains ?? [];

  return (
    <div className="w-full">
      {!props.embedded && (
        <PageHeader
          title="Clusters"
          description="Every Cluster is authenticated and connected independently."
        />
      )}

      <div className="flex flex-col gap-4">
        {domains.length > 0 && (
          <ul aria-label="Clusters" className="m-0 flex list-none flex-col gap-2 p-0">
            {domains.map((itm) => (
              <ClusterItem key={itm.domain} item={itm} />
            ))}
          </ul>
        )}

        <AddCluster hasClusters={domains.length > 0} />
      </div>
    </div>
  );
};

export default Clusters;
