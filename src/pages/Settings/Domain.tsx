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
  type DomainState,
} from "@/gen/client/daemonv1";
import Notice from "@/components/Notice";
import { isAuthenticated, isConnected } from "@/utils/daemon";
import { useAppSelector } from "@/utils/hooks";
import { listAllServices } from "@/utils/resources";
import {
  Alert,
  Button,
  Collapse,
  MultiSelect,
  NumberInput,
  Select,
  Switch,
  TextInput,
} from "@mantine/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronDown, Info, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { twMerge } from "tailwind-merge";
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

const Row = (props: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) => (
  <div className="flex flex-col gap-3 border-b border-line py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <div className="text-sm font-bold text-strong">{props.title}</div>
      {props.description && (
        <div className="mt-0.5 text-sm font-medium text-muted">
          {props.description}
        </div>
      )}
    </div>
    <div className="flex-none">{props.children}</div>
  </div>
);

const PublishedServices = (props: {
  domain: string;
  enabled: boolean;
  items: ConnectionOptions_PublishedService[];
  onChange: (items: ConnectionOptions_PublishedService[]) => void;
}) => {
  const { domain, enabled, items, onChange } = props;
  const servicesQuery = useQuery({
    queryKey: ["user/listService", domain, "published-picker"],
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
          className="rounded-xl border border-line bg-surface-2 p-4"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0 truncate text-sm font-semibold text-strong">
              {getKey(itm) || "Unknown Service"}
            </div>
            <Button
              size="compact-sm"
              variant="subtle"
              color="red"
              aria-label={`Remove ${getKey(itm) || "Service"}`}
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              <Trash2 size={15} aria-hidden />
            </Button>
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

  return (
    <div className="rounded-xl border border-line bg-surface p-6 shadow-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-extrabold tracking-tight text-strong">
            {domain}
          </h2>
          <p className="mt-1 text-sm font-medium text-muted">
            These settings are stored by the Octelium daemon and they are used by
            the next Connection of this Cluster.
          </p>
        </div>

        <Button
          className="flex-none"
          loading={mutation.isPending}
          disabled={!dirty || !!formError}
          leftSection={<Save size={15} aria-hidden />}
          onClick={() => mutation.mutate()}
        >
          Save
        </Button>
      </div>

      {isConnected(state) && (
        <Notice
          className="mt-4"
          title="Already connected"
          icon={<Info size={16} aria-hidden />}
        >
          Saving does not reconfigure the active Connection. Reconnect in order to
          apply the new settings.
        </Notice>
      )}

      {mutation.isError && (
        <Alert color="red" radius="md" className="mt-4" title="Could not save">
          {getErrorMessage(mutation.error)}
        </Alert>
      )}

      {formError && (
        <Alert color="orange" radius="md" className="mt-4" title="Check the settings">
          {formError}
        </Alert>
      )}

      {mutation.isSuccess && (
        <Alert color="green" radius="md" className="mt-4" title="Saved">
          The settings of the Cluster were stored by the daemon.
        </Alert>
      )}

      <div className="mt-3">
        <Row
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
        </Row>

        <Row title="Tunnel mode">
          <Select
            aria-label="Tunnel mode"
            className="w-[170px]"
            data={TUNNEL_MODES}
            allowDeselect={false}
            value={String(options.tunnelMode)}
            onChange={(value) => setOptions({ tunnelMode: Number(value) })}
          />
        </Row>

        <Row title="DNS">
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
        </Row>
      </div>

      <button
        type="button"
        className="mt-4 flex cursor-pointer items-center gap-2 text-sm font-bold text-muted transition-colors hover:text-strong"
        aria-expanded={advanced}
        onClick={() => setAdvanced((value) => !value)}
      >
        <ChevronDown
          size={16}
          aria-hidden
          className={twMerge("transition-transform duration-300", advanced && "rotate-180")}
        />
        Advanced
      </button>

      <Collapse expanded={advanced}>
        <div className="mt-2">
          <Row title="Layer 3 mode">
            <Select
              aria-label="Layer 3 mode"
              className="w-[170px]"
              data={L3_MODES}
              allowDeselect={false}
              value={String(options.l3Mode)}
              onChange={(value) => setOptions({ l3Mode: Number(value) })}
            />
          </Row>

          <Row title="Implementation mode">
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
          </Row>

          <Row title="MTU" description="Leave it empty in order to let the daemon choose.">
            <NumberInput
              aria-label="MTU"
              className="w-[140px]"
              min={576}
              max={1500}
              value={options.mtu || ""}
              onChange={(value) => setOptions({ mtu: Number(value) || 0 })}
            />
          </Row>

          <Row
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
          </Row>

          <Row title="Local DNS listen address">
            <TextInput
              aria-label="Local DNS listen address"
              className="w-[220px]"
              placeholder="127.0.0.1:53"
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
          </Row>

          <Row
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
          </Row>

          <Row
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
          </Row>

          <Row
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
          </Row>

          <div className="border-b border-line py-4 last:border-b-0">
            <div className="mb-3 text-sm font-bold text-strong">
              Published Services
            </div>
            <div className="mb-4 text-sm font-medium text-muted">
              Map Cluster Services to listeners on this machine. Privileged ports
              are refused for unprivileged users by the daemon.
            </div>
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
          </div>
        </div>
      </Collapse>
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
