import ConfirmModal from "@/components/ConfirmModal";
import ClusterSignIn from "@/components/ClusterSignIn";
import Label from "@/components/Label";
import PageHeader from "@/components/PageHeader";
import StatusDot from "@/components/StatusDot";
import { EmptyState } from "@/components/AsyncState";
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
  isConnectionBusy,
} from "@/utils/daemon";
import { useAppSelector } from "@/utils/hooks";
import { openExternal } from "@/utils/native";
import { Button } from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { LogIn, LogOut, Plug, PlugZap, Server, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const AddCluster = () => {
  return (
    <ClusterSignIn
      title="Add another Cluster"
      description="This is an advanced workflow. Your selected domain becomes the primary Cluster shown throughout the app."
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
    <article className="group/item w-full rounded-xl border border-line bg-surface p-4 shadow-xs transition-all duration-500 hover:border-line-strong hover:shadow-md">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
          onClick={() => {
            selectDomain(item.domain);
            navigate("/connection");
          }}
        >
          <StatusDot
            size={12}
            tone={getConnectionStateTone(item.connection?.state)}
            pulse={isConnectionBusy(item)}
          />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-[15px] font-bold tracking-tight text-strong">
                {item.domain}
              </h2>
              {item.domain === selected && (
                <Label tone="sky" className="flex-none">
                  Selected
                </Label>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Label tone={getAuthenticationStateTone(item.authentication?.state)}>
                {getAuthenticationStateLabel(item.authentication?.state)}
              </Label>
              <Label tone="slate">
                {getConnectionStateLabel(item.connection?.state)}
              </Label>
              {item.settings?.autoConnect && (
                <Label tone="neutral">Auto connect</Label>
              )}
            </div>
          </div>
        </button>

        <div className="flex flex-none flex-wrap items-center gap-2">
          {isAuthenticated(item) ? (
            canDisconnect(item) ? (
              <Button
                size="xs"
                variant="outline"
                loading={mutation.isPending && mutation.variables === "disconnect"}
                leftSection={<Plug size={14} aria-hidden />}
                onClick={() => mutation.mutate("disconnect")}
              >
                Disconnect
              </Button>
            ) : (
              <Button
                size="xs"
                disabled={!canConnect(item)}
                loading={mutation.isPending && mutation.variables === "connect"}
                leftSection={<PlugZap size={14} aria-hidden />}
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
              leftSection={<LogIn size={14} aria-hidden />}
              onClick={() => mutationAuth.mutate()}
            >
              Sign in
            </Button>
          )}

          {isAuthenticated(item) && (
            <Button
              size="xs"
              variant="outline"
              leftSection={<LogOut size={14} aria-hidden />}
              onClick={() => setConfirm("logout")}
            >
              Sign out
            </Button>
          )}

          <Button
            size="xs"
            variant="outline"
            color="red"
            leftSection={<Trash2 size={14} aria-hidden />}
            onClick={() => setConfirm("delete")}
          >
            Remove
          </Button>
        </div>
      </div>

      {(mutation.isError || mutationAuth.isError) && confirm === undefined && (
        <div className="mt-3 text-sm font-semibold text-rose-600 dark:text-rose-400">
          {getErrorMessage(mutation.error ?? mutationAuth.error)}
        </div>
      )}

      <ConfirmModal
        opened={confirm === "logout"}
        onClose={() => setConfirm(undefined)}
        onConfirm={() => mutation.mutate("logout")}
        title="Sign out"
        confirmLabel="Sign out"
        isPending={mutation.isPending}
        error={mutation.isError ? getErrorMessage(mutation.error) : undefined}
      >
        Signing out of <strong>{item.domain}</strong> disconnects the Cluster,
        invalidates the Session and removes the stored credentials of this
        machine.
      </ConfirmModal>

      <ConfirmModal
        opened={confirm === "delete"}
        onClose={() => setConfirm(undefined)}
        onConfirm={() => mutation.mutate("delete")}
        title="Remove the Cluster"
        confirmLabel="Remove"
        color="red"
        isPending={mutation.isPending}
        error={mutation.isError ? getErrorMessage(mutation.error) : undefined}
      >
        Removing <strong>{item.domain}</strong> signs out and deletes both the
        credentials and the locally stored settings of the Cluster.
      </ConfirmModal>
    </article>
  );
};

const Clusters = () => {
  const status = useAppSelector((state) => state.daemon.status);
  const domains = status?.domains ?? [];

  return (
    <div className="w-full">
      <PageHeader
        title="Clusters"
        description="Every Cluster is authenticated and connected independently."
      />

      <div className="flex flex-col gap-4">
        <AddCluster />

        {domains.length < 1 ? (
          <EmptyState
            title="No Cluster yet"
            message="Add your Cluster domain above in order to sign in and connect."
            icon={<Server size={22} aria-hidden />}
          />
        ) : (
          <div className="flex w-full flex-col gap-2.5">
            {domains.map((itm) => (
              <ClusterItem key={itm.domain} item={itm} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Clusters;
