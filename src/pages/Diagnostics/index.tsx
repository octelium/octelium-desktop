import { SectionCard } from "@/components/Card";
import CopyText from "@/components/CopyText";
import InfoItem, { InfoGrid } from "@/components/InfoItem";
import Label from "@/components/Label";
import PageHeader from "@/components/PageHeader";
import { toRFC3339 } from "@/utils";
import {
  getAuthenticationStateLabel,
  getAuthenticationStateTone,
  getConnectionL3Mode,
  getConnectionStateLabel,
  getL3ModeLabel,
  getTunnelModeLabel,
  isConnected,
} from "@/utils/daemon";
import { useAppSelector } from "@/utils/hooks";
import { getAppInfo, isNative, type AppInfo } from "@/utils/native";
import { currentAppVersion } from "@/utils/version";
import { Button } from "@mantine/core";
import { AppWindow, Check, ClipboardCopy, Cpu, Globe } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const Mono = (props: { children?: React.ReactNode }) => (
  <span className="font-mono text-xs font-medium break-all" data-selectable>
    {props.children}
  </span>
);

const Diagnostics = () => {
  const info = useAppSelector((state) => state.daemon.info);
  const status = useAppSelector((state) => state.daemon.status);
  const availability = useAppSelector((state) => state.daemon.availability);
  const error = useAppSelector((state) => state.daemon.error);
  const [appInfo, setAppInfo] = useState<AppInfo | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!isNative()) {
      return;
    }

    void getAppInfo().then(setAppInfo).catch(() => {});
  }, []);

  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  const copyReport = async () => {
    const report = {
      application: {
        version: currentAppVersion ?? "development",
        platform: appInfo?.platform,
        arch: appInfo?.arch,
        daemonAddress: appInfo?.daemonAddress,
      },
      daemon: {
        availability,
        error,
        version: info?.version,
        api: info ? `${info.apiMajorVersion}.${info.apiMinorVersion}` : undefined,
        instanceID: info?.instanceID,
        revision: status?.revision,
      },
      domains: (status?.domains ?? []).map((itm) => ({
        domain: itm.domain,
        authentication: getAuthenticationStateLabel(itm.authentication?.state),
        connection: getConnectionStateLabel(itm.connection?.state),
        tunnel: isConnected(itm)
          ? getTunnelModeLabel(itm.connection?.tunnelMode)
          : undefined,
        ipMode: isConnected(itm)
          ? getL3ModeLabel(getConnectionL3Mode(itm.connection))
          : undefined,
        authenticatedAt: toRFC3339(itm.authentication?.authenticatedAt),
        expiresAt: toRFC3339(itm.authentication?.expiresAt),
        connectedAt: toRFC3339(itm.connection?.connectedAt),
        lastError: itm.lastError?.message || undefined,
      })),
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setCopied(true);
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="w-full">
      <PageHeader
        title="Diagnostics"
        description="Runtime information for troubleshooting the application and the local daemon."
        actions={
          <Button
            variant="default"
            size="sm"
            leftSection={
              copied ? (
                <Check size={14} className="text-emerald-500" aria-hidden />
              ) : (
                <ClipboardCopy size={14} aria-hidden />
              )
            }
            onClick={() => void copyReport()}
          >
            {copied ? "Copied" : "Copy report"}
          </Button>
        }
      />

      <div className="flex flex-col gap-4">
        <SectionCard
          title="Daemon"
          description="The privileged Octelium daemon of this machine"
          icon={<Cpu size={14} strokeWidth={2.25} />}
          actions={
            <Label tone={availability === "available" ? "emerald" : "rose"} dot>
              {availability === "available" ? "Available" : "Unavailable"}
            </Label>
          }
        >
          <InfoGrid>
            <InfoItem title="Version">{info?.version || "—"}</InfoItem>
            <InfoItem title="Local API">
              {info ? `v${info.apiMajorVersion}.${info.apiMinorVersion}` : "—"}
            </InfoItem>
            <InfoItem title="Instance">
              {info?.instanceID ? (
                <CopyText value={info.instanceID} truncate={12} label="Copy the instance ID" />
              ) : (
                "—"
              )}
            </InfoItem>
            <InfoItem title="OS principal">
              {info?.principal?.name || info?.principal?.id || "—"}
            </InfoItem>
            <InfoItem title="Socket">
              <Mono>{appInfo?.daemonAddress ?? "—"}</Mono>
            </InfoItem>
            <InfoItem title="State revision">
              <span className="tabular-nums">{status?.revision ?? "—"}</span>
            </InfoItem>
          </InfoGrid>
        </SectionCard>

        <SectionCard
          title="Application"
          description="This desktop application"
          icon={<AppWindow size={14} strokeWidth={2.25} />}
        >
          <InfoGrid>
            <InfoItem title="Version">
              {currentAppVersion ?? "Development build"}
            </InfoItem>
            <InfoItem title="Platform">{appInfo?.platform ?? "—"}</InfoItem>
            <InfoItem title="Architecture">{appInfo?.arch ?? "—"}</InfoItem>
          </InfoGrid>
        </SectionCard>

        {(status?.domains ?? []).map((itm) => (
          <SectionCard
            key={itm.domain}
            title={itm.domain}
            description="Cluster"
            icon={<Globe size={14} strokeWidth={2.25} />}
            actions={
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                <Label tone={getAuthenticationStateTone(itm.authentication?.state)} dot>
                  {getAuthenticationStateLabel(itm.authentication?.state)}
                </Label>
                <Label tone={isConnected(itm) ? "emerald" : "slate"} dot>
                  {getConnectionStateLabel(itm.connection?.state)}
                </Label>
              </div>
            }
          >
            <InfoGrid>
              <InfoItem title="Authenticated at">
                <Mono>{toRFC3339(itm.authentication?.authenticatedAt) ?? "—"}</Mono>
              </InfoItem>
              <InfoItem title="Credentials expire at">
                <Mono>{toRFC3339(itm.authentication?.expiresAt) ?? "—"}</Mono>
              </InfoItem>
              <InfoItem title="Connected at">
                <Mono>{toRFC3339(itm.connection?.connectedAt) ?? "—"}</Mono>
              </InfoItem>
              <InfoItem title="Device">
                <Mono>{itm.connection?.deviceName || "—"}</Mono>
              </InfoItem>
              {isConnected(itm) && (
                <InfoItem title="IP mode">
                  {getL3ModeLabel(getConnectionL3Mode(itm.connection))}
                </InfoItem>
              )}
              <InfoItem title="Last error" className="sm:col-span-2 lg:col-span-3">
                {itm.lastError?.message ? (
                  <Mono>{itm.lastError.message}</Mono>
                ) : (
                  "—"
                )}
              </InfoItem>
            </InfoGrid>
          </SectionCard>
        ))}
      </div>
    </div>
  );
};

export default Diagnostics;
