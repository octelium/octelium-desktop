import {
  EmptyState,
  ErrorState,
  ResourceListSkeleton,
} from "@/components/AsyncState";
import CopyText from "@/components/CopyText";
import HighlightText from "@/components/HighlightText";
import InfoItem from "@/components/InfoItem";
import PageHeader from "@/components/PageHeader";
import PageSizeSelect from "@/components/PageSizeSelect";
import Paginator from "@/components/Paginator";
import RequireDomain from "@/components/RequireDomain";
import {
  ResourceListItem,
  ResourceListLabel,
  ResourceListWrapper,
} from "@/components/ResourceList";
import Notice from "@/components/Notice";
import ResourceName from "@/components/ResourceName";
import SearchField from "@/components/SearchField";
import { useDomainState } from "@/features/daemon/hooks";
import { matchesAllTokens, printResourceNameWithDisplay, tokenizeQuery } from "@/utils";
import { getClientUser } from "@/utils/client";
import { isConnected } from "@/utils/daemon";
import { useAppSelector, useFilterParams } from "@/utils/hooks";
import { openExternal } from "@/utils/native";
import { getPage, listAllNamespaces, listAllServices } from "@/utils/resources";
import {
  getServiceHostname,
  getServicePrivateFQDN,
  getServicePublicFQDN,
  getServicePublicURL,
  isServiceWebBrowsable,
} from "@/utils/octelium";
import {
  getServiceTypeByKey,
  getServiceTypeInfo,
  SERVICE_TYPE_OPTIONS,
  type ServiceTypeInfo,
} from "@/utils/octelium/serviceTypes";
import { Button, Collapse, Select } from "@mantine/core";
import {
  CommonListOptions_OrderBy_Mode,
  CommonListOptions_OrderBy_Type,
} from "@octelium/apis/main/metav1";
import {
  ListServiceOptions,
  Service,
  Service_Spec_Type,
} from "@octelium/apis/main/userv1";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  ChevronDown,
  Globe,
  Info,
  SearchX,
  ShieldCheck,
} from "lucide-react";
import * as React from "react";
import { twMerge } from "tailwind-merge";

const ORDER_BY_NAME = {
  type: CommonListOptions_OrderBy_Type.NAME,
  mode: CommonListOptions_OrderBy_Mode.ASC,
};

const Mono = (props: { children?: React.ReactNode }) => (
  <span className="font-mono text-[13px] break-all" data-selectable>
    {props.children}
  </span>
);

const ServiceTypeTile = (props: { info: ServiceTypeInfo }) => (
  <div
    className={twMerge(
      "flex h-11 w-11 flex-none items-center justify-center rounded-full",
      "shadow-xs ring-1 transition-transform duration-200",
      "group-hover/item:scale-[1.04]",
      props.info.tile,
    )}
    role="img"
    aria-label={`${props.info.label} service`}
    title={props.info.label}
  >
    <props.info.icon size={22} className="text-white" aria-hidden />
  </div>
);

const ItemDetails = (props: { item: Service; domain: string }) => {
  const { item, domain } = props;
  const metadata = item.metadata;
  const addresses = item.status?.addresses ?? [];

  return (
    <div className="mt-4 rounded-xl border border-line bg-surface-2 p-4">
      {metadata?.description && (
        <p className="mb-4 text-sm font-medium text-body">
          {metadata.description}
        </p>
      )}
      <dl className="grid gap-4 sm:grid-cols-2">
        <InfoItem title="Private FQDN">
          <Mono>
            <CopyText value={getServicePrivateFQDN(item, domain)} />
          </Mono>
        </InfoItem>
        {item.spec?.isPublic && (
          <InfoItem title="Public FQDN">
            <Mono>
              <CopyText value={getServicePublicFQDN(item, domain)} />
            </Mono>
          </InfoItem>
        )}
        <InfoItem title="Resource name">
          <Mono>
            <CopyText value={metadata?.name} />
          </Mono>
        </InfoItem>
        {addresses.length > 0 && (
          <InfoItem title="Private addresses" className="sm:col-span-2">
            <div className="flex flex-wrap gap-x-8 gap-y-1">
              {addresses.map((address) => (
                <Mono key={address}>
                  <CopyText value={address} />
                </Mono>
              ))}
            </div>
          </InfoItem>
        )}
      </dl>
    </div>
  );
};

const ServiceItem = (props: {
  item: Service;
  domain: string;
  tokens: string[];
}) => {
  const { item, domain, tokens } = props;
  const metadata = item.metadata;
  const [expanded, setExpanded] = React.useState(false);
  const [openError, setOpenError] = React.useState<string | undefined>();
  const [isOpening, setIsOpening] = React.useState(false);
  const typeInfo = getServiceTypeInfo(item);
  const hostname = getServiceHostname(item);

  return (
    <ResourceListItem>
      <div className="flex items-start gap-3">
        <ServiceTypeTile info={typeInfo} />

        <div className="min-w-0 flex-1">
          <ResourceName
            name={metadata?.name ?? ""}
            displayName={metadata?.displayName}
            splitNamespace
            highlight={tokens}
          />

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <ResourceListLabel className={typeInfo.chip}>
              {typeInfo.label}
            </ResourceListLabel>

            <ResourceListLabel label="Port" tone="slate">
              {item.spec?.port ?? 0}
            </ResourceListLabel>

            {item.spec?.isTLS && (
              <ResourceListLabel
                tone="emerald"
                icon={<ShieldCheck size={12} aria-hidden />}
              >
                TLS
              </ResourceListLabel>
            )}

            {item.spec?.isPublic && (
              <ResourceListLabel tone="sky" icon={<Globe size={12} aria-hidden />}>
                Public
              </ResourceListLabel>
            )}

            <ResourceListLabel tone="neutral" title="Private hostname">
              <Mono>
                <HighlightText text={hostname} tokens={tokens} />
              </Mono>
            </ResourceListLabel>
          </div>
        </div>

        <div className="flex flex-none items-center gap-2">
          {item.spec?.isPublic && isServiceWebBrowsable(item) && (
            <Button
              size="xs"
              variant="outline"
              loading={isOpening}
              leftSection={<ArrowUpRight size={14} aria-hidden />}
              onClick={async () => {
                try {
                  setOpenError(undefined);
                  setIsOpening(true);
                  await openExternal(getServicePublicURL(item, domain));
                } catch (err) {
                  setOpenError(err instanceof Error ? err.message : String(err));
                } finally {
                  setIsOpening(false);
                }
              }}
            >
              Open
            </Button>
          )}

          <button
            type="button"
            aria-label={expanded ? "Hide the details" : "Show the details"}
            aria-expanded={expanded}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-faint transition-colors hover:bg-surface-3 hover:text-strong"
            onClick={() => setExpanded((value) => !value)}
          >
            <ChevronDown
              size={18}
              aria-hidden
              className={twMerge(
                "transition-transform duration-300",
                expanded && "rotate-180",
              )}
            />
          </button>
        </div>
      </div>

      {openError && (
        <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">
          Could not open this Service: {openError}
        </p>
      )}

      <Collapse expanded={expanded}>
        <ItemDetails item={item} domain={domain} />
      </Collapse>
    </ResourceListItem>
  );
};

const ServiceList = (props: { domain: string }) => {
  const { domain } = props;
  const { searchParams, setParams } = useFilterParams();
  const itemsPerPage = useAppSelector((state) => state.prefs.prefs.itemsPerPage);
  const state = useDomainState(domain);

  const search = searchParams.get("search") ?? "";
  const namespace = searchParams.get("namespace") ?? "";
  const typeKey = searchParams.get("type") ?? "";
  const page = getPage(searchParams.get("common.page"));

  const tokens = tokenizeQuery(search);
  const isSearching = tokens.length > 0;
  const typeInfo = getServiceTypeByKey(typeKey);

  const namespacesQuery = useQuery({
    queryKey: ["user/listNamespace", domain],
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

  const items = React.useMemo(() => {
    const ret = servicesQuery.data?.items ?? [];
    if (!isSearching) {
      return ret;
    }

    return ret.filter((itm) =>
      matchesAllTokens(
        `${itm.metadata?.name ?? ""} ${itm.metadata?.displayName ?? ""} ${
          itm.metadata?.description ?? ""
        }`.toLowerCase(),
        tokens,
      ),
    );
  }, [isSearching, servicesQuery.data, tokens]);

  const namespaceItems = (namespacesQuery.data ?? []).map((itm) =>
    printResourceNameWithDisplay(itm.metadata!),
  );

  return (
    <div className="w-full">
      <PageHeader
        title="Services"
        description={`The Services you are authorized to access at ${domain}`}
        actions={<PageSizeSelect />}
      />

      {!isConnected(state) && (
        <Notice
          className="mb-6"
          title="Not connected"
          icon={<Info size={16} aria-hidden />}
        >
          You can browse the Services of the Cluster while disconnected. Connect
          in order to actually reach them from this machine.
        </Notice>
      )}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <SearchField
          className="flex-1"
          value={search}
          onChange={(value) => setParams({ search: value || null })}
          placeholder="Search the Services…"
        />

        <Select
          className="sm:w-[190px]"
          label="Namespace"
          placeholder="Every Namespace"
          clearable
          searchable
          data={(namespacesQuery.data ?? []).map(
            (itm) => itm.metadata?.name ?? "",
          )}
          value={namespace || null}
          onChange={(value) => setParams({ namespace: value })}
          nothingFoundMessage={
            namespaceItems.length < 1 ? "No Namespace" : "Nothing found"
          }
        />

        <Select
          className="sm:w-[170px]"
          label="Type"
          placeholder="Every type"
          clearable
          data={SERVICE_TYPE_OPTIONS}
          value={typeKey || null}
          onChange={(value) => setParams({ type: value })}
        />
      </div>

      {servicesQuery.isPending && <ResourceListSkeleton />}

      {servicesQuery.isError && (
        <ErrorState
          title="Unable to load the Services"
          message="The Cluster API could not be reached. Check that you are still signed in."
          onRetry={() => servicesQuery.refetch()}
        />
      )}

      {servicesQuery.isSuccess && items.length < 1 && (
        <EmptyState
          title={isSearching ? "Nothing found" : "No Service"}
          message={
            isSearching
              ? "No Service matches your search in this Cluster."
              : "You are not authorized to access any Service yet."
          }
          icon={<SearchX size={22} aria-hidden />}
        />
      )}

      {items.length > 0 && (
        <ResourceListWrapper>
          {items.map((itm) => (
            <ServiceItem
              key={itm.metadata?.uid ?? itm.metadata?.name}
              item={itm}
              domain={domain}
              tokens={tokens}
            />
          ))}
        </ResourceListWrapper>
      )}

      {!isSearching && (
        <Paginator meta={servicesQuery.data?.listResponseMeta} />
      )}
    </div>
  );
};

const List = () => (
  <RequireDomain>{(domain) => <ServiceList domain={domain} />}</RequireDomain>
);

export default List;
