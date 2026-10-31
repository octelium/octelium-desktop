import Avatar from "@/components/Avatar";
import { Card, SectionCard } from "@/components/Card";
import ClusterSignIn from "@/components/ClusterSignIn";
import CopyText from "@/components/CopyText";
import ErrorBanner from "@/components/ErrorBanner";
import InfoItem, { InfoGrid } from "@/components/InfoItem";
import Label from "@/components/Label";
import PageHeader from "@/components/PageHeader";
import TimeAgo from "@/components/TimeAgo";
import {
  authenticateBrowser,
  connect,
  disconnect,
  getErrorMessage,
} from "@/features/daemon/actions";
import { useClusterStatus, useDomainState } from "@/features/daemon/hooks";
import { ConnectionStatus_State, Error_Code } from "@/gen/client/daemonv1";
import { printDuration, toRFC3339 } from "@/utils";
import {
  canConnect,
  canDisconnect,
  getAuthenticationStateLabel,
  getAuthenticationStateTone,
  getConnectionAddresses,
  getConnectionL3Mode,
  getConnectionStateLabel,
  getConnectionStateTone,
  getDNSModeLabel,
  getImplementationModeLabel,
  getL3ModeLabel,
  getPendingOpenURL,
  getTunnelModeLabel,
  isAuthenticated,
  isConnected,
  isConnectionBusy,
  isOperationActive,
  type ConnectivityTone,
} from "@/utils/daemon";
import { useAppSelector } from "@/utils/hooks";
import { openExternal } from "@/utils/native";
import { getUserDisplayName, getUserPicURL } from "@/utils/octelium";
import { Button } from "@mantine/core";
import type { Timestamp } from "@octelium/apis/google/protobuf/timestamp";
import { useMutation } from "@tanstack/react-query";
import {
  Loader2,
  Network,
  Plug,
  PlugZap,
  Shield,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { twMerge } from "@/utils/tailwind";

const ORB_TONES: Record<ConnectivityTone, string> = {
  connected:
    "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  pending:
    "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
  idle: "border-line bg-surface-2 text-muted",
  error:
    "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
};

const BUSY_DESCRIPTIONS: Partial<Record<ConnectionStatus_State, string>> = {
  [ConnectionStatus_State.CONNECTING]: "Establishing a secure tunnel to",
  [ConnectionStatus_State.RECONNECTING]: "Restoring the secure tunnel to",
  [ConnectionStatus_State.DISCONNECTING]: "Tearing down the secure tunnel to",
};

const Mono = (props: { children?: React.ReactNode }) => (
  <span className="font-mono text-xs font-medium break-all" data-selectable>
    {props.children}
  </span>
);

const Elapsed = (props: { since: Timestamp }) => {
  const [, setClock] = useState(0);
  const key = `${props.since.seconds}:${props.since.nanos}`;

  useEffect(() => {
    const timer = window.setInterval(
      () => setClock((value) => value + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [key]);

  return <span className="tabular-nums">{printDuration(props.since)}</span>;
};

const Account = (props: { domain: string }) => {
  const statusQuery = useClusterStatus(props.domain);
  const state = useDomainState(props.domain);
  const status = statusQuery.data;

  if (!status) {
    return null;
  }

  const displayName = getUserDisplayName(status);
  const name = status.user?.metadata?.name;
  const email = status.user?.spec?.email?.trim();
  const sessionConnected = status.session?.status?.isConnected;

  return (
    <SectionCard
      title="Account"
      description="The identity this device is signed in with"
      icon={<UserRound size={14} strokeWidth={2.25} />}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Avatar src={getUserPicURL(status)} name={displayName} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-strong">
            {displayName ?? "Unknown User"}
          </p>
          {email && (
            <p className="truncate text-xs text-muted" data-selectable>
              {email}
            </p>
          )}
        </div>
      </div>

      <InfoGrid className="mt-4 border-t border-line-subtle pt-4">
        {name && (
          <InfoItem title="User">
            <CopyText value={name} label="Copy the User name" />
          </InfoItem>
        )}
        <InfoItem title="Session">
          {status.session?.metadata?.name ? (
            <CopyText
              value={status.session.metadata.name}
              label="Copy the Session name"
            />
          ) : (
            "—"
          )}
        </InfoItem>
        <InfoItem title="Cluster">
          {status.cluster?.metadata?.displayName ||
            status.cluster?.metadata?.name ||
            props.domain}
        </InfoItem>
        <InfoItem title="Cluster-side state">
          <Label tone={sessionConnected ? "emerald" : "slate"} dot>
            {sessionConnected ? "Connected" : "Not connected"}
          </Label>
        </InfoItem>
        <InfoItem title="Signed in">
          {state?.authentication?.authenticatedAt ? (
            <TimeAgo rfc3339={toRFC3339(state.authentication.authenticatedAt)} />
          ) : (
            "—"
          )}
        </InfoItem>
        {state?.authentication?.expiresAt && (
          <InfoItem title="Credentials expire">
            <TimeAgo rfc3339={toRFC3339(state.authentication.expiresAt)} />
          </InfoItem>
        )}
      </InfoGrid>
    </SectionCard>
  );
};

const Connection = () => {
  const domain = useAppSelector((state) => state.daemon.selectedDomain);
  const state = useDomainState(domain);

  const mutationConnect = useMutation({
    mutationFn: async () => {
      await connect(domain!);
    },
  });

  const mutationDisconnect = useMutation({
    mutationFn: async () => {
      await disconnect(domain!);
    },
  });

  const mutationAuth = useMutation({
    mutationFn: async () => {
      const operation = await authenticateBrowser(domain!);
      const url = getPendingOpenURL({ domain: domain!, lastOperation: operation });
      if (url) {
        await openExternal(url);
      }
    },
  });

  if (!domain) {
    return <ClusterSignIn />;
  }

  if (!isAuthenticated(state)) {
    return (
      <>
        <ErrorBanner error={state?.lastError} />
        <ClusterSignIn domain={domain} />
      </>
    );
  }

  const connection = state?.connection;
  const connected = isConnected(state);
  const connecting = isConnectionBusy(state);
  const tone = getConnectionStateTone(connection?.state);
  const busy =
    connecting ||
    isOperationActive(state?.lastOperation) ||
    mutationConnect.isPending ||
    mutationDisconnect.isPending ||
    mutationAuth.isPending;

  const addresses = getConnectionAddresses(connection);
  const dns = connection?.dns;

  return (
    <div className="flex w-full flex-col">
      <PageHeader
        title="Connection"
        description={domain}
        actions={
          <Label tone={getAuthenticationStateTone(state?.authentication?.state)} dot>
            {getAuthenticationStateLabel(state?.authentication?.state)}
          </Label>
        }
      />

      <ErrorBanner
        error={state?.lastError}
        isPending={
          state?.lastError?.code === Error_Code.AUTHENTICATION_REQUIRED
            ? mutationAuth.isPending
            : mutationConnect.isPending
        }
        disabled={busy}
        onRetry={() => mutationConnect.mutate()}
        onSignIn={() => mutationAuth.mutate()}
      />

      <div className="flex flex-col gap-4">
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <div
              aria-hidden
              className={twMerge(
                "flex h-12 w-12 flex-none items-center justify-center rounded-2xl border transition-colors duration-300",
                ORB_TONES[tone],
              )}
            >
              {connecting ? (
                <Loader2 size={22} className="animate-spin" />
              ) : connected ? (
                <ShieldCheck size={22} />
              ) : (
                <Shield size={22} />
              )}
            </div>

            <div className="min-w-0 flex-1" aria-live="polite">
              <div className="text-lg leading-tight font-bold tracking-tight text-strong">
                {getConnectionStateLabel(connection?.state)}
              </div>
              <div className="mt-1 truncate text-ui text-muted">
                {connected && connection?.connectedAt ? (
                  <>
                    Secured for <Elapsed since={connection.connectedAt} />
                  </>
                ) : connecting && connection?.state ? (
                  `${BUSY_DESCRIPTIONS[connection.state]} ${domain}`
                ) : (
                  "Connect in order to reach the Services of this Cluster."
                )}
              </div>
            </div>

            <div className="flex flex-none items-center gap-2">
              {canDisconnect(state) ? (
                <Button
                  size="md"
                  variant="default"
                  loading={mutationDisconnect.isPending}
                  leftSection={<Plug size={16} aria-hidden />}
                  onClick={() => mutationDisconnect.mutate()}
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  size="md"
                  loading={mutationConnect.isPending}
                  disabled={!canConnect(state) || busy}
                  leftSection={<PlugZap size={16} aria-hidden />}
                  onClick={() => mutationConnect.mutate()}
                >
                  Connect
                </Button>
              )}
            </div>
          </div>

          {(mutationConnect.isError ||
            mutationDisconnect.isError ||
            mutationAuth.isError) && (
            <div
              role="alert"
              className="border-t border-line-subtle bg-rose-50 px-5 py-2.5 text-xs font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
            >
              {getErrorMessage(
                mutationConnect.error ?? mutationDisconnect.error ?? mutationAuth.error,
              )}
            </div>
          )}

          {connected && (
            <dl className="m-0 grid grid-cols-2 border-t border-line-subtle bg-surface-2 sm:grid-cols-4">
              <InfoItem title="Tunnel" className="px-5 py-3">
                {getTunnelModeLabel(connection?.tunnelMode)}
              </InfoItem>
              <InfoItem title="Implementation" className="px-5 py-3">
                {getImplementationModeLabel(
                  connection?.implementationMode,
                  connection?.tunnelMode,
                )}
              </InfoItem>
              <InfoItem title="IP mode" className="px-5 py-3">
                {getL3ModeLabel(getConnectionL3Mode(connection))}
              </InfoItem>
              <InfoItem title="DNS" className="px-5 py-3">
                {getDNSModeLabel(dns?.mode)}
                {dns?.isConfigured === false && " (not applied)"}
              </InfoItem>
            </dl>
          )}
        </Card>

        {connected && (
          <SectionCard
            title="Network"
            description="The local network configuration of this Connection"
            icon={<Network size={14} strokeWidth={2.25} />}
          >
            <InfoGrid>
              <InfoItem title="Device">
                <Mono>{connection?.deviceName || "—"}</Mono>
              </InfoItem>
              <InfoItem title="MTU">
                <span className="tabular-nums">{connection?.mtu || "—"}</span>
              </InfoItem>
              <InfoItem title="Connected at">
                <TimeAgo rfc3339={toRFC3339(connection?.connectedAt)} />
              </InfoItem>

              {addresses.length > 0 && (
                <InfoItem title="Addresses" className="sm:col-span-2 lg:col-span-3">
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    {addresses.map((itm) => (
                      <CopyText key={itm} value={itm} label="Copy the address" />
                    ))}
                  </div>
                </InfoItem>
              )}

              {(dns?.servers ?? []).length > 0 && (
                <InfoItem title="DNS servers" className="sm:col-span-2">
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    {dns?.servers.map((itm) => (
                      <CopyText key={itm} value={itm} label="Copy the address" />
                    ))}
                  </div>
                </InfoItem>
              )}

              {dns?.localServerListenAddress && (
                <InfoItem title="Local DNS server">
                  <Mono>{dns.localServerListenAddress}</Mono>
                </InfoItem>
              )}
            </InfoGrid>
          </SectionCard>
        )}

        <Account domain={domain} />
      </div>
    </div>
  );
};

export default Connection;
