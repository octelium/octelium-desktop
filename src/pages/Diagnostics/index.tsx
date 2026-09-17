import CopyText from "@/components/CopyText";
import InfoItem from "@/components/InfoItem";
import Label from "@/components/Label";
import PageHeader from "@/components/PageHeader";
import { toRFC3339 } from "@/utils";
import {
  getAuthenticationStateLabel,
  getConnectionStateLabel,
} from "@/utils/daemon";
import { useAppSelector } from "@/utils/hooks";
import { getAppInfo, isNative, type AppInfo } from "@/utils/native";
import { currentAppVersion } from "@/utils/version";
import { useEffect, useState } from "react";

const Mono = (props: { children?: React.ReactNode }) => (
  <span className="font-mono text-[13px] break-all" data-selectable>
    {props.children}
  </span>
);

const Diagnostics = () => {
  const info = useAppSelector((state) => state.daemon.info);
  const status = useAppSelector((state) => state.daemon.status);
  const availability = useAppSelector((state) => state.daemon.availability);
  const [appInfo, setAppInfo] = useState<AppInfo | undefined>(undefined);

  useEffect(() => {
    if (!isNative()) {
      return;
    }

    void getAppInfo().then(setAppInfo).catch(() => {});
  }, []);

  return (
    <div className="w-full">
      <PageHeader
        title="Diagnostics"
        description="Runtime information for troubleshooting the application and local daemon."
      />

      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-line bg-surface p-6 shadow-xs">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-sm font-extrabold tracking-tight text-strong">
              Daemon
            </h2>
            <Label tone={availability === "available" ? "emerald" : "rose"}>
              {availability === "available" ? "Available" : "Unavailable"}
            </Label>
          </div>
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem title="Version">{info?.version || "—"}</InfoItem>
            <InfoItem title="Local API">
              {info ? `v${info.apiMajorVersion}.${info.apiMinorVersion}` : "—"}
            </InfoItem>
            <InfoItem title="Instance">
              <Mono>
                <CopyText value={info?.instanceID} truncate={12} />
              </Mono>
            </InfoItem>
            <InfoItem title="OS principal">
              {info?.principal?.name || info?.principal?.id || "—"}
            </InfoItem>
            <InfoItem title="Socket">
              <Mono>{appInfo?.daemonAddress ?? "—"}</Mono>
            </InfoItem>
            <InfoItem title="State revision">{status?.revision ?? "—"}</InfoItem>
          </dl>
        </div>

        <div className="rounded-xl border border-line bg-surface p-6 shadow-xs">
          <h2 className="mb-4 text-sm font-extrabold tracking-tight text-strong">
            Application
          </h2>
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem title="Version">{currentAppVersion ?? "Development build"}</InfoItem>
            <InfoItem title="Platform">{appInfo?.platform ?? "—"}</InfoItem>
            <InfoItem title="Architecture">{appInfo?.arch ?? "—"}</InfoItem>
          </dl>
        </div>

        {(status?.domains ?? []).map((itm) => (
          <div
            key={itm.domain}
            className="rounded-xl border border-line bg-surface p-6 shadow-xs"
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-extrabold tracking-tight text-strong">
                {itm.domain}
              </h2>
              <Label tone="slate">
                {getConnectionStateLabel(itm.connection?.state)}
              </Label>
              <Label tone="neutral">
                {getAuthenticationStateLabel(itm.authentication?.state)}
              </Label>
            </div>

            <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <InfoItem title="Authenticated at">
                <Mono>
                  {toRFC3339(itm.authentication?.authenticatedAt) ?? "—"}
                </Mono>
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
              <InfoItem title="Last error">
                {itm.lastError?.message || "—"}
              </InfoItem>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Diagnostics;
