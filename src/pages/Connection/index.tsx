import ErrorBanner from "@/components/ErrorBanner";
import ClusterSignIn from "@/components/ClusterSignIn";
import InfoItem from "@/components/InfoItem";
import Label from "@/components/Label";
import PageHeader from "@/components/PageHeader";
import StatusDot from "@/components/StatusDot";
import TimeAgo from "@/components/TimeAgo";
import CopyText from "@/components/CopyText";
import { connect, disconnect, getErrorMessage } from "@/features/daemon/actions";
import { useDomainState } from "@/features/daemon/hooks";
import { getClientUser } from "@/utils/client";
import { printDuration, toRFC3339 } from "@/utils";
import {
  canConnect,
  canDisconnect,
  getAuthenticationStateLabel,
  getAuthenticationStateTone,
  getConnectionStateLabel,
  getConnectionStateTone,
  getDNSModeLabel,
  getImplementationModeLabel,
  getTunnelModeLabel,
  isAuthenticated,
  isConnected,
  isConnectionBusy,
} from "@/utils/daemon";
import { useAppSelector } from "@/utils/hooks";
import { Button } from "@mantine/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plug, PlugZap, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

const Mono = (props: { children?: React.ReactNode }) => (
  <span className="font-mono text-[13px] break-all" data-selectable>
    {props.children}
  </span>
);

const Connection = () => {
  const [, setClock] = useState(0);
  const domain = useAppSelector((state) => state.daemon.selectedDomain);
  const state = useDomainState(domain);
  const connected = isConnected(state);
  const connectedAt = state?.connection?.connectedAt;
  const connectedAtKey = connectedAt
    ? `${connectedAt.seconds}:${connectedAt.nanos}`
    : "";

  useEffect(() => {
    if (!connected) {
      return;
    }
    const timer = window.setInterval(
      () => setClock((value) => value + 1),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [connected, connectedAtKey]);

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

  const statusQuery = useQuery({
    queryKey: ["user/getStatus", domain],
    enabled: !!domain && isConnected(state),
    queryFn: async () => {
      const { response } = await getClientUser(domain!).getStatus({});
      return response;
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
  const busy =
    isConnectionBusy(state) ||
    mutationConnect.isPending ||
    mutationDisconnect.isPending;

  const addresses = connection?.addresses ?? [];
  const dns = connection?.dns;

  return (
    <div className="w-full">
      <PageHeader
        title="Connection"
        description={domain}
        actions={
          <div className="flex items-center gap-2">
            <Label tone={getAuthenticationStateTone(state?.authentication?.state)}>
              <ShieldCheck size={13} aria-hidden />
              {getAuthenticationStateLabel(state?.authentication?.state)}
            </Label>
          </div>
        }
      />

      <ErrorBanner
        error={state?.lastError}
        isPending={mutationConnect.isPending}
        onRetry={() => mutationConnect.mutate()}
      />

      <div className="rounded-xl border border-line bg-surface p-6 shadow-xs">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <StatusDot
              size={14}
              tone={getConnectionStateTone(connection?.state)}
              pulse={isConnectionBusy(state)}
            />
            <div>
              <div className="text-xl font-extrabold tracking-tight text-strong">
                {getConnectionStateLabel(connection?.state)}
              </div>
              <div className="mt-0.5 text-sm font-medium text-muted">
                {isConnected(state) && connection?.connectedAt
                  ? `Connected for ${printDuration(connection.connectedAt)}`
                  : isAuthenticated(state)
                    ? "Your Cluster credentials are ready"
                    : "Sign in to the Cluster in order to connect"}
              </div>
            </div>
          </div>

          <div className="flex flex-none items-center gap-3">
            {canDisconnect(state) ? (
              <Button
                size="md"
                variant="outline"
                loading={mutationDisconnect.isPending}
                leftSection={<Plug size={17} aria-hidden />}
                onClick={() => mutationDisconnect.mutate()}
              >
                Disconnect
              </Button>
            ) : (
              <Button
                size="md"
                loading={mutationConnect.isPending}
                disabled={!canConnect(state) || busy}
                leftSection={<PlugZap size={17} aria-hidden />}
                onClick={() => mutationConnect.mutate()}
              >
                Connect
              </Button>
            )}
          </div>
        </div>

        {(mutationConnect.isError || mutationDisconnect.isError) && (
          <div className="mt-4 text-sm font-semibold text-rose-600 dark:text-rose-400">
            {getErrorMessage(mutationConnect.error ?? mutationDisconnect.error)}
          </div>
        )}
      </div>

      {isConnected(state) && (
        <div className="mt-4 rounded-xl border border-line bg-surface p-6 shadow-xs">
          <h2 className="mb-4 text-sm font-extrabold tracking-tight text-strong">
            Tunnel
          </h2>
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem title="Tunnel mode">
              {getTunnelModeLabel(connection?.tunnelMode)}
            </InfoItem>
            <InfoItem title="Implementation">
              {getImplementationModeLabel(connection?.implementationMode)}
            </InfoItem>
            <InfoItem title="Device">
              <Mono>{connection?.deviceName || "—"}</Mono>
            </InfoItem>
            <InfoItem title="MTU">{connection?.mtu || "—"}</InfoItem>
            <InfoItem title="Connected at">
              <TimeAgo rfc3339={toRFC3339(connection?.connectedAt)} />
            </InfoItem>
            <InfoItem title="DNS">
              {getDNSModeLabel(dns?.mode)}
              {dns?.isConfigured === false && " (not applied)"}
            </InfoItem>

            {addresses.map((itm, index) => (
              <InfoItem key={index} title="Addresses">
                <div className="flex flex-col gap-1">
                  {itm.v4 && (
                    <Mono>
                      <CopyText value={itm.v4} />
                    </Mono>
                  )}
                  {itm.v6 && (
                    <Mono>
                      <CopyText value={itm.v6} />
                    </Mono>
                  )}
                </div>
              </InfoItem>
            ))}

            {(dns?.servers ?? []).length > 0 && (
              <InfoItem title="DNS servers" className="sm:col-span-2">
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  {dns?.servers.map((itm) => (
                    <Mono key={itm}>
                      <CopyText value={itm} />
                    </Mono>
                  ))}
                </div>
              </InfoItem>
            )}

            {dns?.localServerListenAddress && (
              <InfoItem title="Local DNS server">
                <Mono>{dns.localServerListenAddress}</Mono>
              </InfoItem>
            )}
          </dl>
        </div>
      )}

      {statusQuery.data && (
        <div className="mt-4 rounded-xl border border-line bg-surface p-6 shadow-xs">
          <h2 className="mb-4 text-sm font-extrabold tracking-tight text-strong">
            Session
          </h2>
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem title="User">
              {statusQuery.data.user?.metadata?.name ?? "—"}
            </InfoItem>
            <InfoItem title="Email">
              {statusQuery.data.user?.spec?.email || "—"}
            </InfoItem>
            <InfoItem title="Cluster">
              {statusQuery.data.cluster?.metadata?.name ?? domain}
            </InfoItem>
            <InfoItem title="Session">
              <Mono>{statusQuery.data.session?.metadata?.name ?? "—"}</Mono>
            </InfoItem>
            <InfoItem title="Cluster-side state">
              {statusQuery.data.session?.status?.isConnected
                ? "Connected"
                : "Not connected"}
            </InfoItem>
          </dl>
        </div>
      )}
    </div>
  );
};

export default Connection;
