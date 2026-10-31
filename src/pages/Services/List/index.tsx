import {
  EmptyState,
  ErrorState,
  ResourceListSkeleton,
} from "@/components/AsyncState";
import { IconTile } from "@/components/Card";
import CopyText from "@/components/CopyText";
import HighlightText from "@/components/HighlightText";
import InfoItem, { InfoGrid } from "@/components/InfoItem";
import Notice from "@/components/Notice";
import PageHeader from "@/components/PageHeader";
import PageSizeSelect from "@/components/PageSizeSelect";
import Paginator from "@/components/Paginator";
import RefreshButton from "@/components/RefreshButton";
import RequireDomain from "@/components/RequireDomain";
import {
  ResourceListItem,
  ResourceListLabel,
  ResourceListLabelWrap,
  ResourceListWrapper,
} from "@/components/ResourceList";
import SearchField from "@/components/SearchField";
import { connect, getErrorMessage } from "@/features/daemon/actions";
import { useDomainState } from "@/features/daemon/hooks";
import { matchesAllTokens, printResourceNameWithDisplay, tokenizeQuery } from "@/utils";
import { getClientUser } from "@/utils/client";
import { canConnect, isConnected } from "@/utils/daemon";
import { useAppSelector, useFilterParams } from "@/utils/hooks";
import { openExternal } from "@/utils/native";
import { getPage, listAllNamespaces, listAllServices } from "@/utils/resources";
import {
  getServiceHostname,
  getServicePrivateFQDN,
  getServicePublicURL,
  isServiceWebBrowsable,
} from "@/utils/octelium";
import {
  getServiceTypeByKey,
  getServiceTypeInfo,
  SERVICE_TYPE_OPTIONS,
} from "@/utils/octelium/serviceTypes";
import { ActionIcon, Button, Collapse, Select } from "@mantine/core";
import {
  CommonListOptions_OrderBy_Mode,
  CommonListOptions_OrderBy_Type,
} from "@octelium/apis/main/metav1";
import {
  ListServiceOptions,
  Service,
  Service_Spec_Type,
} from "@octelium/apis/main/userv1";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  ChevronDown,
  FilterX,
  Globe,
  Info,
  Lock,
  PanelTop,
  PlugZap,
  SearchX,
  X,
} from "lucide-react";
import * as React from "react";
import { twMerge } from "@/utils/tailwind";

const ORDER_BY_NAME = {
  type: CommonListOptions_OrderBy_Type.NAME,
  mode: CommonListOptions_OrderBy_Mode.ASC,
};

const typeOptionIcons = new Map(
  SERVICE_TYPE_OPTIONS.map((option) => [
    option.value,
    getServiceTypeByKey(option.value)!.icon,
  ]),
);

const ItemDetails = (props: { item: Service; domain: string }) => {
  const { item, domain } = props;
  const metadata = item.metadata;
  const addresses = item.status?.addresses ?? [];
  const publicURL = item.spec?.isPublic
    ? getServicePublicURL(item, domain)
    : undefined;

  return (
    <div className="border-t border-line-subtle px-4 pt-3.5 pb-4 sm:pl-16">
      <InfoGrid className="lg:grid-cols-2">
        <InfoItem title="Private hostname">
          <CopyText
            value={getServicePrivateFQDN(item, domain)}
            label="Copy the private hostname"
          />
        </InfoItem>
        {publicURL && (
          <InfoItem title="Public URL">
            <span className="inline-flex max-w-full min-w-0 items-center gap-1">
              <a
                href={publicURL}
                draggable={false}
                onClick={(event) => {
                  event.preventDefault();
                  void openExternal(publicURL).catch(() => {});
                }}
                className="min-w-0 font-mono text-xs font-medium text-sky-700 underline-offset-2 [overflow-wrap:anywhere] hover:underline dark:text-sky-300"
              >
                {publicURL}
              </a>
              <CopyText value={publicURL} label="Copy the public URL" hide />
            </span>
          </InfoItem>
        )}
        <InfoItem title="Resource name">
          <CopyText value={metadata?.name} label="Copy the resource name" />
        </InfoItem>
        {addresses.length > 0 && (
          <InfoItem title="Private addresses" className="sm:col-span-2">
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              {addresses.map((address) => (
                <CopyText key={address} value={address} label="Copy the address" />
              ))}
            </div>
          </InfoItem>
        )}
      </InfoGrid>
    </div>
  );
};

const ServiceItem = (props: {
  item: Service;
  domain: string;
  tokens: string[];
  namespaceFilter: string;
  typeFilter?: string;
  buildURL: (updates: Record<string, string | null>) => string;
}) => {
  const { item, domain, tokens } = props;
  const metadata = item.metadata;
  const [expanded, setExpanded] = React.useState(false);
  const detailsId = React.useId();
  const typeInfo = getServiceTypeInfo(item);
  const hostname = getServiceHostname(item);
  const separatorIndex = hostname.indexOf(".");
  const name = separatorIndex > 0 ? hostname.slice(0, separatorIndex) : hostname;
  const suffix = separatorIndex > 0 ? hostname.slice(separatorIndex) : "";
  const namespace = item.status?.namespace;
  const subtitle = [metadata?.displayName, metadata?.description].filter(
    (itm): itm is string => !!itm,
  );

  const mutationOpen = useMutation({
    mutationFn: () => openExternal(getServicePublicURL(item, domain)),
  });

  const toggleFromRow = (event: React.MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (
      target.closest("a, button, input, [role='button']") ||
      window.getSelection()?.toString()
    ) {
      return;
    }
    setExpanded((value) => !value);
  };

  return (
    <ResourceListItem
      className={twMerge(expanded && "border-line-strong shadow-raised")}
    >
      <div
        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 px-4 py-3.5"
        onClick={toggleFromRow}
      >
        <IconTile className="sm:row-span-2">
          <typeInfo.icon size={16} aria-hidden />
        </IconTile>

        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1">
            <h2 className="min-w-0 truncate text-sm font-medium text-strong">
              <HighlightText text={name} tokens={tokens} />
              {suffix && (
                <span className="font-normal text-faint">
                  <HighlightText text={suffix} tokens={tokens} />
                </span>
              )}
            </h2>
            <CopyText
              value={getServicePrivateFQDN(item, domain)}
              label="Copy the private hostname"
              hide
            />
          </div>
          {subtitle.length > 0 && (
            <p className="truncate text-xs leading-5 text-muted">
              {subtitle.map((itm, index) => (
                <span key={index}>
                  {index > 0 && (
                    <span aria-hidden className="mx-1.5 text-faint">
                      ·
                    </span>
                  )}
                  <HighlightText text={itm} tokens={tokens} />
                </span>
              ))}
            </p>
          )}
        </div>

        <div className="flex flex-none items-center gap-1 sm:row-span-2">
          {item.spec?.isPublic && isServiceWebBrowsable(item) && (
            <Button
              size="xs"
              variant="default"
              loading={mutationOpen.isPending}
              rightSection={<ArrowUpRight size={13} strokeWidth={2.25} aria-hidden />}
              aria-label={`Open ${hostname} in your browser`}
              onClick={() => mutationOpen.mutate()}
            >
              Open
            </Button>
          )}
          <ActionIcon
            size={30}
            aria-controls={detailsId}
            aria-expanded={expanded}
            aria-label={`${expanded ? "Hide" : "Show"} the details of ${hostname}`}
            onClick={() => setExpanded((value) => !value)}
          >
            <ChevronDown
              size={16}
              strokeWidth={2.25}
              aria-hidden
              className={twMerge(
                "text-muted transition-transform duration-200",
                expanded && "rotate-180",
              )}
            />
          </ActionIcon>
        </div>

        <ResourceListLabelWrap className="col-span-3 mt-2 sm:col-span-1 sm:col-start-2">
          {typeInfo.key !== "UNSET" && (
            <ResourceListLabel
              label="Type"
              title={`Show only the ${typeInfo.label} Services`}
              to={
                props.typeFilter === typeInfo.key
                  ? undefined
                  : props.buildURL({ type: typeInfo.key })
              }
            >
              {typeInfo.label}
            </ResourceListLabel>
          )}
          {namespace && (
            <ResourceListLabel
              label="Namespace"
              title={`Show only the Services of the ${namespace} Namespace`}
              to={
                props.namespaceFilter === namespace
                  ? undefined
                  : props.buildURL({ namespace })
              }
            >
              <HighlightText text={namespace} tokens={tokens} />
            </ResourceListLabel>
          )}
          {item.spec?.port ? (
            <ResourceListLabel label="Port">
              <span className="tabular-nums">{item.spec.port}</span>
            </ResourceListLabel>
          ) : null}
          {item.spec?.isTLS && (
            <ResourceListLabel
              icon={<Lock aria-hidden />}
              title="This Service is served over TLS"
            >
              TLS
            </ResourceListLabel>
          )}
          {item.spec?.isPublic && (
            <ResourceListLabel
              icon={<Globe aria-hidden />}
              title="This Service is publicly accessible without the Octelium client"
            >
              Public
            </ResourceListLabel>
          )}
        </ResourceListLabelWrap>
      </div>

      {mutationOpen.isError && (
        <p className="m-0 border-t border-line-subtle px-4 py-2 text-xs font-medium text-rose-700 dark:text-rose-300">
          Could not open this Service: {getErrorMessage(mutationOpen.error)}
        </p>
      )}

      <Collapse
        id={detailsId}
        expanded={expanded}
        transitionDuration={200}
        keepMounted={false}
      >
        <ItemDetails item={item} domain={domain} />
      </Collapse>
    </ResourceListItem>
  );
};

const FilterChip = (props: {
  label: string;
  value: string;
  onClear: () => void;
}) => (
  <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-line bg-surface py-0.5 pr-0.5 pl-2 text-micro font-medium text-body shadow-card">
    <span className="flex-none text-muted">{props.label}:</span>
    <span className="min-w-0 truncate">{props.value}</span>
    <button
      type="button"
      aria-label={`Remove the ${props.label} filter`}
      className="flex h-4 w-4 flex-none items-center justify-center rounded text-faint transition-colors hover:bg-surface-3 hover:text-strong"
      onClick={props.onClear}
    >
      <X size={10} strokeWidth={2.5} aria-hidden />
    </button>
  </span>
);

const ServiceList = (props: { domain: string }) => {
  const { domain } = props;
  const { searchParams, setParams, buildURL } = useFilterParams();
  const itemsPerPage = useAppSelector((state) => state.prefs.prefs.itemsPerPage);
  const state = useDomainState(domain);

  const search = searchParams.get("search") ?? "";
  const namespace = searchParams.get("namespace") ?? "";
  const typeKey = searchParams.get("type") ?? "";
  const page = getPage(searchParams.get("common.page"));

  const tokens = React.useMemo(() => tokenizeQuery(search), [search]);
  const isSearching = tokens.length > 0;
  const typeInfo = getServiceTypeByKey(typeKey);

  const namespacesQuery = useQuery({
    queryKey: ["user/listNamespace", domain],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      return listAllNamespaces(domain);
    },
  });

  const servicesQuery = useQuery({
    queryKey: [
      "user/listService",
      domain,
      namespace,
      typeKey,
      isSearching ? "all" : page,
      isSearching ? "all" : itemsPerPage,
    ],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      if (isSearching) {
        const items = await listAllServices(domain, {
          namespace,
          type: typeInfo?.type,
        });
        return { items, listResponseMeta: undefined };
      }
      const { response } = await getClientUser(domain).listService(
        ListServiceOptions.create({
          common: {
            page,
            itemsPerPage,
            orderBy: ORDER_BY_NAME,
          },
          namespace,
          type: typeInfo?.type ?? Service_Spec_Type.UNSET,
        }),
      );
      return response;
    },
  });

  const mutationConnect = useMutation({
    mutationFn: () => connect(domain),
  });

  const items = React.useMemo(() => {
    const ret = servicesQuery.data?.items ?? [];
    if (!isSearching) {
      return ret;
    }

    return ret.filter((itm) =>
      matchesAllTokens(
        [
          getServiceHostname(itm),
          itm.metadata?.name,
          itm.metadata?.displayName,
          itm.metadata?.description,
          itm.status?.namespace,
          getServiceTypeInfo(itm).label,
          itm.spec?.port ? String(itm.spec.port) : "",
          ...(itm.status?.addresses ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
        tokens,
      ),
    );
  }, [isSearching, servicesQuery.data, tokens]);

  const namespaceData = (namespacesQuery.data ?? [])
    .filter((itm) => itm.metadata?.name)
    .map((itm) => ({
      value: itm.metadata!.name,
      label: printResourceNameWithDisplay(itm.metadata!),
    }));

  if (namespace && !namespaceData.some((itm) => itm.value === namespace)) {
    namespaceData.unshift({ value: namespace, label: namespace });
  }

  const hasFilters = isSearching || namespace !== "" || typeInfo !== undefined;
  const totalCount = isSearching
    ? undefined
    : servicesQuery.data?.listResponseMeta?.totalCount;
  const clearFilters = () =>
    setParams({ search: null, namespace: null, type: null });

  return (
    <div className="w-full">
      <PageHeader
        title="Services"
        addon={
          totalCount !== undefined && (
            <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-micro font-medium text-muted tabular-nums">
              {totalCount.toLocaleString()}
            </span>
          )
        }
        description={`The Services you are authorized to access at ${domain}`}
        actions={
          <RefreshButton
            label="Refresh the Services"
            loading={servicesQuery.isFetching && !servicesQuery.isPending}
            onClick={() => {
              void namespacesQuery.refetch();
              void servicesQuery.refetch();
            }}
          />
        }
      />

      {!isConnected(state) && (
        <Notice
          className="mb-4"
          tone="sky"
          title="Not connected"
          icon={<Info size={15} aria-hidden />}
          actions={
            canConnect(state) && (
              <Button
                size="xs"
                loading={mutationConnect.isPending}
                leftSection={<PlugZap size={13} aria-hidden />}
                onClick={() => mutationConnect.mutate()}
              >
                Connect
              </Button>
            )
          }
        >
          You can browse the Services of the Cluster while disconnected. Connect
          in order to actually reach them from this machine.
          {mutationConnect.isError && (
            <div className="mt-1 font-medium text-rose-700 dark:text-rose-300">
              {getErrorMessage(mutationConnect.error)}
            </div>
          )}
        </Notice>
      )}

      <div className="mb-4 flex flex-col gap-2.5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <SearchField
            className="min-w-0 flex-1"
            label="Search the Services"
            value={search}
            onChange={(value) => setParams({ search: value || null }, { replace: true })}
            placeholder="Search by name, Namespace, type, port or address"
          />
          <div className="grid grid-cols-2 gap-2 md:flex md:flex-none">
            <Select
              className="min-w-0 md:w-48"
              aria-label="Filter by Namespace"
              placeholder="All Namespaces"
              clearable
              searchable
              data={namespaceData}
              value={namespace || null}
              onChange={(value) => setParams({ namespace: value })}
              nothingFoundMessage={
                namespaceData.length < 1 ? "No Namespace" : "Nothing found"
              }
            />
            <Select
              className="min-w-0 md:w-44"
              aria-label="Filter by type"
              placeholder="All types"
              clearable
              data={SERVICE_TYPE_OPTIONS}
              value={typeInfo?.key ?? null}
              onChange={(value) => setParams({ type: value })}
              renderOption={({ option }) => {
                const Icon = typeOptionIcons.get(option.value);
                return (
                  <span className="flex items-center gap-2">
                    {Icon && <Icon size={14} className="flex-none opacity-70" />}
                    {option.label}
                  </span>
                );
              }}
            />
          </div>
        </div>

        {hasFilters && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-0.5 text-micro font-medium tracking-[0.06em] text-muted uppercase">
              Filters
            </span>
            {isSearching && (
              <FilterChip
                label="Search"
                value={search}
                onClear={() => setParams({ search: null })}
              />
            )}
            {namespace && (
              <FilterChip
                label="Namespace"
                value={namespace}
                onClear={() => setParams({ namespace: null })}
              />
            )}
            {typeInfo && (
              <FilterChip
                label="Type"
                value={typeInfo.label}
                onClear={() => setParams({ type: null })}
              />
            )}
            <button
              type="button"
              className="ml-1.5 rounded text-xs font-medium text-muted transition-colors hover:text-strong"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {servicesQuery.isPending && <ResourceListSkeleton />}

      {servicesQuery.isError && !servicesQuery.data && (
        <ErrorState
          title="Unable to load the Services"
          message="The Cluster API could not be reached. Check that you are still signed in."
          onRetry={() => servicesQuery.refetch()}
        />
      )}

      {servicesQuery.data && (
        <div
          className={twMerge(
            "transition-opacity duration-200",
            servicesQuery.isPlaceholderData && "opacity-60",
          )}
          aria-busy={servicesQuery.isPlaceholderData || undefined}
        >
          {items.length < 1 ? (
            <EmptyState
              title={hasFilters ? "No matching Services" : "No Service"}
              message={
                isSearching
                  ? `Nothing matched “${search}”. Try another name, Namespace or type.`
                  : hasFilters
                    ? "No Service matches the current filters."
                    : "You are not authorized to access any Service yet."
              }
              icon={
                hasFilters ? (
                  isSearching ? (
                    <SearchX size={18} aria-hidden />
                  ) : (
                    <FilterX size={18} aria-hidden />
                  )
                ) : (
                  <PanelTop size={18} aria-hidden />
                )
              }
              action={
                hasFilters && (
                  <Button
                    variant="default"
                    size="sm"
                    leftSection={<FilterX size={14} aria-hidden />}
                    onClick={clearFilters}
                  >
                    Clear filters
                  </Button>
                )
              }
            />
          ) : (
            <ResourceListWrapper>
              {items.map((itm) => (
                <ServiceItem
                  key={itm.metadata?.uid ?? itm.metadata?.name}
                  item={itm}
                  domain={domain}
                  tokens={tokens}
                  namespaceFilter={namespace}
                  typeFilter={typeInfo?.key}
                  buildURL={buildURL}
                />
              ))}
            </ResourceListWrapper>
          )}

          {isSearching ? (
            items.length > 0 && (
              <p className="mt-4 text-xs text-muted tabular-nums">
                {items.length.toLocaleString()}{" "}
                {items.length === 1 ? "Service matches" : "Services match"}
              </p>
            )
          ) : (
            <Paginator meta={servicesQuery.data.listResponseMeta}>
              <PageSizeSelect />
            </Paginator>
          )}
        </div>
      )}
    </div>
  );
};

const List = () => (
  <RequireDomain>{(domain) => <ServiceList domain={domain} />}</RequireDomain>
);

export default List;
