import { SectionCard } from "@/components/Card";
import ConfirmModal from "@/components/ConfirmModal";
import Notice from "@/components/Notice";
import SettingRow from "@/components/SettingRow";
import { getErrorMessage, updateDomainSettings } from "@/features/daemon/actions";
import { useDomainState } from "@/features/daemon/hooks";
import {
  ConnectionOptions,
  ConnectionOptions_DNS_Mode,
  ConnectionOptions_ImplementationMode,
  ConnectionOptions_L3Mode,
  ConnectionOptions_TunnelMode,
  DomainSettings,
  type ConnectionOptions_PublishedService,
  type ConnectionOptions_ServiceReference,
  type DomainState,
} from "@/gen/client/daemonv1";
import { isAuthenticated, isConnected } from "@/utils/daemon";
import { useAppSelector } from "@/utils/hooks";
import { listAllServices } from "@/utils/resources";
import {
  ActionIcon,
  Button,
  Collapse,
  MultiSelect,
  NumberInput,
  Select,
  Switch,
  TextInput,
} from "@mantine/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRightLeft,
  Check,
  ChevronDown,
  Info,
  Network,
  Plug,
  Save,
  Server,
  Trash2,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useBeforeUnload, useBlocker } from "react-router-dom";
import { twMerge } from "@/utils/tailwind";
import type { Service } from "@octelium/apis/main/userv1";

const TUNNEL_MODES = [
  { value: String(ConnectionOptions_TunnelMode.TUNNEL_MODE_UNSPECIFIED), label: "Automatic" },
  { value: String(ConnectionOptions_TunnelMode.WIREGUARD), label: "WireGuard" },
  { value: String(ConnectionOptions_TunnelMode.QUICV0), label: "QUIC" },
];

const IMPLEMENTATION_MODES = [
  {
    value: String(ConnectionOptions_ImplementationMode.IMPLEMENTATION_MODE_UNSPECIFIED),
    label: "Automatic",
  },
  { value: String(ConnectionOptions_ImplementationMode.KERNEL), label: "Kernel" },
  { value: String(ConnectionOptions_ImplementationMode.TUN), label: "TUN" },
  { value: String(ConnectionOptions_ImplementationMode.GVISOR), label: "gVisor" },
];

const L3_MODES = [
  { value: String(ConnectionOptions_L3Mode.L3_MODE_UNSPECIFIED), label: "Automatic" },
  { value: String(ConnectionOptions_L3Mode.BOTH), label: "Dual stack" },
  { value: String(ConnectionOptions_L3Mode.V4), label: "IPv4 only" },
  { value: String(ConnectionOptions_L3Mode.V6), label: "IPv6 only" },
];

const DNS_MODES = [
  { value: String(ConnectionOptions_DNS_Mode.DEFAULT), label: "Split DNS" },
  { value: String(ConnectionOptions_DNS_Mode.FULL), label: "Full DNS" },
  { value: String(ConnectionOptions_DNS_Mode.DISABLED), label: "Disabled" },
];

const getServiceReferenceKey = (name?: string, namespace?: string) => {
  if (!name) {
    return "";
  }
  if (name.includes(".")) {
    return name;
  }
  return name + "." + (namespace || "default");
};

const splitServiceReferenceKey = (value: string) => {
  const index = value.indexOf(".");
  if (index < 1) {
    return { name: value, namespace: "" };
  }
  const namespace = value.slice(index + 1);
  return {
    name: value.slice(0, index),
    namespace: namespace === "default" ? "" : namespace,
  };
};

const PublishedServices = (props: {
  domain: string;
  enabled: boolean;
  items: ConnectionOptions_PublishedService[];
  onChange: (items: ConnectionOptions_PublishedService[]) => void;
}) => {
  const { domain, enabled, items, onChange } = props;
  const servicesQuery = useQuery({
    queryKey: ["user/listService", domain, "settings-picker"],
    enabled,
    queryFn: () => listAllServices(domain),
  });

  const getKey = (item: ConnectionOptions_PublishedService) =>
    getServiceReferenceKey(item.service?.name, item.service?.namespace);

  const services = servicesQuery.data ?? [];
  const serviceByName = new Map(
    services.map((service) => [service.metadata?.name ?? "", service]),
  );
  const selected = items.map(getKey).filter(Boolean);
  const available = new Map<string, Service>();
  for (const service of services) {
    if (service.metadata?.name) {
      available.set(service.metadata.name, service);
    }
  }

  const data = [...new Set([...available.keys(), ...selected])].map((value) => {
    const service = available.get(value);
    return {
      value,
      label: service?.metadata?.displayName
        ? `${service.metadata.displayName} · ${value}`
        : value,
    };
  });

  const setSelected = (values: string[]) => {
    onChange(
      values.map((value) => {
        const existing = items.find((item) => getKey(item) === value);
        if (existing) {
          return existing;
        }
        const ref = splitServiceReferenceKey(value);
        return {
          service: ref,
          address: "",
          port: serviceByName.get(value)?.spec?.port ?? 0,
        };
      }),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <MultiSelect
        label="Services"
        description={
          enabled
            ? "Search and select one or more Services to expose locally."
            : "Sign in to select from the Services available to you."
        }
        placeholder={selected.length > 0 ? undefined : "Search Services"}
        searchable
        clearable
        hidePickedOptions
        disabled={!enabled}
        data={data}
        value={selected}
        onChange={setSelected}
        nothingFoundMessage={
          servicesQuery.isLoading ? "Loading Services…" : "No Service found"
        }
        error={
          servicesQuery.isError
            ? "The Service list could not be loaded. Check your Session."
            : undefined
        }
      />

      {items.map((itm, index) => (
        <div
          key={getKey(itm) || index}
          className="rounded-xl border border-line bg-surface-2 p-3.5"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0 truncate font-mono text-xs font-medium text-strong">
              {getKey(itm) || "Unknown Service"}
            </div>
            <ActionIcon
              size={28}
              color="red"
              aria-label={`Remove ${getKey(itm) || "Service"}`}
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              <Trash2 size={14} aria-hidden />
            </ActionIcon>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
            <TextInput
              label="Local address"
              description="Empty uses the normal loopback binding."
              placeholder="localhost"
              value={itm.address}
              onChange={(event) => {
                const next = [...items];
                next[index] = { ...itm, address: event.currentTarget.value };
                onChange(next);
              }}
            />
            <NumberInput
              label="Local port"
              min={1}
              max={65535}
              value={itm.port || ""}
              onChange={(value) => {
                const next = [...items];
                next[index] = { ...itm, port: Number(value) || 0 };
                onChange(next);
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const ServedServices = (props: {
  domain: string;
  enabled: boolean;
  items: ConnectionOptions_ServiceReference[];
  onChange: (items: ConnectionOptions_ServiceReference[]) => void;
}) => {
  const { domain, enabled, items, onChange } = props;
  const servicesQuery = useQuery({
    queryKey: ["user/listService", domain, "settings-picker"],
    enabled,
    queryFn: () => listAllServices(domain),
  });

  const selected = items
    .map((item) => getServiceReferenceKey(item.name, item.namespace))
    .filter(Boolean);
  const services = servicesQuery.data ?? [];
  const available = new Map(
    services
      .filter((service) => service.metadata?.name)
      .map((service) => [service.metadata!.name!, service]),
  );
  const data = [...new Set([...available.keys(), ...selected])].map((value) => {
    const service = available.get(value);
    return {
      value,
      label: service?.metadata?.displayName
        ? `${service.metadata.displayName} · ${value}`
        : value,
    };
  });

  return (
    <MultiSelect
      label="Services to host"
      description={
        enabled
          ? "Search and select one or more Services this device should host."
          : "Sign in to select from the Services available to you."
      }
      placeholder={selected.length > 0 ? undefined : "Search Services"}
      searchable
      clearable
      hidePickedOptions
      disabled={!enabled}
      data={data}
      value={selected}
      onChange={(values) =>
        onChange(
          values.map(
            (value) =>
              items.find(
                (item) =>
                  getServiceReferenceKey(item.name, item.namespace) === value,
              ) ?? splitServiceReferenceKey(value),
          ),
        )
      }
      nothingFoundMessage={
        servicesQuery.isLoading ? "Loading Services…" : "No Service found"
      }
      error={
        servicesQuery.isError
          ? "The Service list could not be loaded. Check your Session."
          : undefined
      }
    />
  );
};

const getFormSettings = (
  domain: string,
  settings?: DomainSettings,
): DomainSettings =>
  DomainSettings.create({
    domain,
    autoConnect: settings?.autoConnect ?? false,
    connectionOptions: settings?.connectionOptions ?? ConnectionOptions.create(),
  });

const getSettingsError = (settings: DomainSettings): string | undefined => {
  const published = settings.connectionOptions?.serviceOptions?.publish ?? [];
  const names = new Set<string>();

  for (const item of published) {
    const name = item.service?.name.trim() ?? "";
    const namespace = item.service?.namespace.trim() ?? "";
    if (!name) {
      return "Every published Service must have a name.";
    }
    const key = getServiceReferenceKey(name, namespace);
    if (names.has(key)) {
      return `The Service ${key} is selected more than once.`;
    }
    names.add(key);
    if (!Number.isInteger(item.port) || item.port < 1 || item.port > 65535) {
      return `Choose a valid local port for ${key}.`;
    }
  }

  return undefined;
};

const DomainSettingsEditor = (props: {
  domain: string;
  state?: DomainState;
}) => {
  const { domain, state } = props;
  const [advanced, setAdvanced] = useState(false);

  const current = state?.settings;
  const [settings, setSettings] = useState<DomainSettings>(() =>
    getFormSettings(domain, current),
  );
  const [baseline, setBaseline] = useState<DomainSettings>(() =>
    getFormSettings(domain, current),
  );
  const mutation = useMutation({
    mutationFn: async () => {
      return updateDomainSettings(domain, settings);
    },
    onSuccess: (response) => {
      const next = getFormSettings(domain, response);
      setSettings(next);
      setBaseline(next);
    },
  });

  const options = settings.connectionOptions ?? ConnectionOptions.create();
  const dns = options.dns ?? { mode: 0, enableLocalServer: false, localServerListenAddress: "" };
  const serviceOptions = options.serviceOptions ?? {
    serveAll: false,
    serve: [],
    publish: [],
    enableEmbeddedSSH: false,
    enableEmbeddedSOCKS5: false,
  };

  const setOptions = (arg: Partial<ConnectionOptions>) => {
    mutation.reset();
    setSettings({
      ...settings,
      connectionOptions: { ...options, ...arg },
    });
  };

  const formError = getSettingsError(settings);
  const dirty = !DomainSettings.equals(settings, baseline);
  const blocker = useBlocker(dirty);

  useBeforeUnload(
    useCallback(
      (event) => {
        if (dirty) {
          event.preventDefault();
          event.returnValue = "";
        }
      },
      [dirty],
    ),
  );

  const reset = () => {
    setSettings(getFormSettings(domain, baseline));
    mutation.reset();
  };

  return (
    <div className="relative flex flex-col gap-4 pb-1">
      {isConnected(state) && (
        <Notice
          tone="sky"
          title="Already connected"
          icon={<Info size={15} aria-hidden />}
        >
          Saving does not reconfigure the active Connection. Reconnect in order to
          apply the new settings.
        </Notice>
      )}

      {mutation.isError && (
        <Notice
          tone="rose"
          title="Could not save"
          icon={<AlertTriangle size={15} aria-hidden />}
        >
          {getErrorMessage(mutation.error)}
        </Notice>
      )}

      {formError && (
        <Notice
          tone="amber"
          title="Check the settings"
          icon={<AlertTriangle size={15} aria-hidden />}
        >
          {formError}
        </Notice>
      )}

      {mutation.isSuccess && (
        <Notice
          tone="emerald"
          title="Saved"
          icon={<Check size={15} aria-hidden />}
        >
          The settings of the Cluster were stored by the daemon.
        </Notice>
      )}

      <SectionCard
        title={domain}
        description="Stored by the Octelium daemon and used by the next Connection"
        icon={<Plug size={14} strokeWidth={2.25} />}
      >
        <SettingRow
          title="Auto connect"
          description="The daemon connects this Cluster on its own whenever usable credentials are available."
        >
          <Switch
            aria-label="Auto connect"
            checked={settings.autoConnect}
            onChange={(event) => {
              mutation.reset();
              setSettings({
                ...settings,
                autoConnect: event.currentTarget.checked,
              });
            }}
          />
        </SettingRow>

        <SettingRow
          title="Tunnel mode"
          description="Automatic lets the daemon choose the best tunnel for this host."
        >
          <Select
            aria-label="Tunnel mode"
            className="w-[170px]"
            data={TUNNEL_MODES}
            allowDeselect={false}
            value={String(options.tunnelMode)}
            onChange={(value) => setOptions({ tunnelMode: Number(value) })}
          />
        </SettingRow>

        <SettingRow
          title="DNS"
          description="Split DNS only resolves the names of this Cluster through Octelium."
        >
          <Select
            aria-label="DNS mode"
            className="w-[170px]"
            data={DNS_MODES}
            allowDeselect={false}
            value={String(dns.mode || ConnectionOptions_DNS_Mode.DEFAULT)}
            onChange={(value) =>
              setOptions({ dns: { ...dns, mode: Number(value) } })
            }
          />
        </SettingRow>
      </SectionCard>

      <button
        type="button"
        className="flex items-center gap-1.5 self-start rounded-md px-1 py-0.5 text-ui font-medium text-muted transition-colors hover:text-strong"
        aria-expanded={advanced}
        onClick={() => setAdvanced((value) => !value)}
      >
        <ChevronDown
          size={15}
          aria-hidden
          className={twMerge(
            "transition-transform duration-200",
            !advanced && "-rotate-90",
          )}
        />
        Advanced settings
      </button>

      <Collapse expanded={advanced} transitionDuration={200}>
        <div className="flex flex-col gap-4">
          <SectionCard
            title="Networking"
            description="Low-level options of the tunnel and of the host DNS"
            icon={<Network size={14} strokeWidth={2.25} />}
          >
            <SettingRow
              title="IP mode"
              description="Automatic prefers IPv6 only whenever this host supports IPv6."
            >
              <Select
                aria-label="IP mode"
                className="w-[170px]"
                data={L3_MODES}
                allowDeselect={false}
                value={String(options.l3Mode)}
                onChange={(value) => setOptions({ l3Mode: Number(value) })}
              />
            </SettingRow>

            <SettingRow title="Implementation mode">
              <Select
                aria-label="Implementation mode"
                className="w-[170px]"
                data={IMPLEMENTATION_MODES}
                allowDeselect={false}
                value={String(options.implementationMode)}
                onChange={(value) =>
                  setOptions({ implementationMode: Number(value) })
                }
              />
            </SettingRow>

            <SettingRow
              title="MTU"
              description="Leave it empty in order to let the daemon choose."
            >
              <NumberInput
                aria-label="MTU"
                className="w-[170px]"
                placeholder="Automatic"
                min={576}
                max={1500}
                value={options.mtu || ""}
                onChange={(value) => setOptions({ mtu: Number(value) || 0 })}
              />
            </SettingRow>

            <SettingRow
              title="Local DNS server"
              description="Run the Octelium local DNS server on this machine."
            >
              <Switch
                aria-label="Local DNS server"
                checked={dns.enableLocalServer}
                onChange={(event) =>
                  setOptions({
                    dns: { ...dns, enableLocalServer: event.currentTarget.checked },
                  })
                }
              />
            </SettingRow>

            {dns.enableLocalServer && (
              <SettingRow title="Local DNS listen address">
                <TextInput
                  aria-label="Local DNS listen address"
                  className="w-[220px]"
                  placeholder="127.0.0.1:53"
                  spellCheck={false}
                  value={dns.localServerListenAddress}
                  onChange={(event) =>
                    setOptions({
                      dns: {
                        ...dns,
                        localServerListenAddress: event.currentTarget.value,
                      },
                    })
                  }
                />
              </SettingRow>
            )}
          </SectionCard>

          <SectionCard
            title="Hosting"
            description="Services and embedded servers hosted by this device"
            icon={<Server size={14} strokeWidth={2.25} />}
          >
            <SettingRow
              title="Host every Service"
              description="Host every Service that your User is authorized to host."
            >
              <Switch
                aria-label="Host every Service"
                checked={serviceOptions.serveAll}
                onChange={(event) =>
                  setOptions({
                    serviceOptions: {
                      ...serviceOptions,
                      serveAll: event.currentTarget.checked,
                      serve: event.currentTarget.checked
                        ? []
                        : serviceOptions.serve,
                    },
                  })
                }
              />
            </SettingRow>

            {!serviceOptions.serveAll && (
              <div className="border-b border-line-subtle py-3.5">
                <ServedServices
                  domain={domain}
                  enabled={isAuthenticated(state)}
                  items={serviceOptions.serve}
                  onChange={(items) =>
                    setOptions({
                      serviceOptions: { ...serviceOptions, serve: items },
                    })
                  }
                />
              </div>
            )}

            <SettingRow
              title="Embedded SSH server"
              description="Serve the embedded SSH server of the Connection."
            >
              <Switch
                aria-label="Embedded SSH server"
                checked={serviceOptions.enableEmbeddedSSH}
                onChange={(event) =>
                  setOptions({
                    serviceOptions: {
                      ...serviceOptions,
                      enableEmbeddedSSH: event.currentTarget.checked,
                    },
                  })
                }
              />
            </SettingRow>

            <SettingRow
              title="Embedded SOCKS5 server"
              description="Serve the embedded SOCKS5 server of the Connection."
            >
              <Switch
                aria-label="Embedded SOCKS5 server"
                checked={serviceOptions.enableEmbeddedSOCKS5}
                onChange={(event) =>
                  setOptions({
                    serviceOptions: {
                      ...serviceOptions,
                      enableEmbeddedSOCKS5: event.currentTarget.checked,
                    },
                  })
                }
              />
            </SettingRow>
          </SectionCard>

          <SectionCard
            title="Published Services"
            description="Map Cluster Services to listeners on this machine"
            icon={<ArrowRightLeft size={14} strokeWidth={2.25} />}
          >
            <p className="mb-3 text-xs leading-5 text-muted">
              Privileged ports are refused for unprivileged users by the daemon.
            </p>
            <PublishedServices
              domain={domain}
              enabled={isAuthenticated(state)}
              items={serviceOptions.publish}
              onChange={(items) =>
                setOptions({
                  serviceOptions: { ...serviceOptions, publish: items },
                })
              }
            />
          </SectionCard>
        </div>
      </Collapse>

      {dirty && (
        <div className="sticky bottom-4 z-20 flex animate-page-in flex-col gap-3 rounded-xl border border-line-strong bg-surface/90 py-2.5 pr-2.5 pl-4 shadow-overlay backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-ui font-medium text-strong">
              Unsaved changes
            </div>
            <div className="text-xs text-muted">
              Save or cancel before leaving these Cluster settings.
            </div>
          </div>
          <div className="flex flex-none items-center justify-end gap-2">
            <Button
              variant="default"
              size="sm"
              disabled={mutation.isPending}
              onClick={reset}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              loading={mutation.isPending}
              disabled={!!formError}
              leftSection={<Save size={14} aria-hidden />}
              onClick={() => mutation.mutate()}
            >
              Save changes
            </Button>
          </div>
        </div>
      )}

      <ConfirmModal
        opened={blocker.state === "blocked"}
        onClose={() => {
          if (blocker.state === "blocked") {
            blocker.reset();
          }
        }}
        onConfirm={() => {
          if (blocker.state === "blocked") {
            blocker.proceed();
          }
        }}
        title="Discard unsaved changes?"
        confirmLabel="Discard changes"
        color="red"
      >
        Your unsaved Cluster settings will be lost if you leave this page.
      </ConfirmModal>
    </div>
  );
};

const DomainSettingsForm = (props: { domain: string }) => {
  const state = useDomainState(props.domain);
  const settingsKey = JSON.stringify(state?.settings ?? null);

  return (
    <DomainSettingsEditor
      key={props.domain + ":" + settingsKey}
      domain={props.domain}
      state={state}
    />
  );
};

const Domain = () => {
  const domain = useAppSelector((state) => state.daemon.selectedDomain);

  if (!domain) {
    return null;
  }

  return <DomainSettingsForm domain={domain} />;
};

export default Domain;
