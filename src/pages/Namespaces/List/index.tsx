import { EmptyState, ErrorState } from "@/components/AsyncState";
import { IconTile } from "@/components/Card";
import { FilterBar } from "@/components/FilterBar";
import HighlightText from "@/components/HighlightText";
import Label from "@/components/Label";
import PageHeader from "@/components/PageHeader";
import PageSizeSelect from "@/components/PageSizeSelect";
import Paginator from "@/components/Paginator";
import RefreshButton from "@/components/RefreshButton";
import RequireDomain from "@/components/RequireDomain";
import SearchField from "@/components/SearchField";
import { matchesAllTokens, tokenizeQuery } from "@/utils";
import { getClientUser } from "@/utils/client";
import { useAppSelector, useFilterParams } from "@/utils/hooks";
import { getPage, listAllNamespaces } from "@/utils/resources";
import {
  CommonListOptions_OrderBy_Mode,
  CommonListOptions_OrderBy_Type,
} from "@octelium/apis/main/metav1";
import {
  ListNamespaceOptions,
  ListServiceOptions,
  type Namespace,
} from "@octelium/apis/main/userv1";
import { keepPreviousData, useQueries, useQuery } from "@tanstack/react-query";
import { Boxes, ChevronRight, PanelTop, SearchX } from "lucide-react";
import * as React from "react";
import { Link } from "react-router-dom";
import { twMerge } from "@/utils/tailwind";

const ORDER_BY_NAME = {
  type: CommonListOptions_OrderBy_Type.NAME,
  mode: CommonListOptions_OrderBy_Mode.ASC,
};

const NamespaceCard = (props: {
  item: Namespace;
  serviceCount?: number;
  tokens: string[];
}) => {
  const { item, serviceCount, tokens } = props;
  const metadata = item.metadata;
  const name = metadata?.name ?? "";

  return (
    <li className="flex">
      <Link
        to={`/services?namespace=${encodeURIComponent(name)}`}
        aria-label={`${name}: show its Services`}
        className="group/card flex w-full flex-col rounded-xl border border-line bg-surface shadow-surface outline-none transition-[border-color,box-shadow] duration-150 hover:border-line-strong hover:shadow-raised focus-visible:ring-2 focus-visible:ring-focus"
      >
        <div className="flex items-start gap-3 px-4 pt-3.5">
          <IconTile>
            <Boxes size={16} strokeWidth={1.9} aria-hidden />
          </IconTile>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-semibold text-strong">
                <HighlightText text={name} tokens={tokens} />
              </span>
              {metadata?.isSystem && <Label tone="sky">System</Label>}
            </div>
            {metadata?.displayName && (
              <p className="truncate text-xs leading-5 font-normal text-muted">
                <HighlightText text={metadata.displayName} tokens={tokens} />
              </p>
            )}
          </div>
          <ChevronRight
            size={16}
            className="mt-2 flex-none text-faint transition-[color,transform] duration-150 group-hover/card:translate-x-0.5 group-hover/card:text-body"
            aria-hidden
          />
        </div>

        {metadata?.description && (
          <p className="mt-2.5 line-clamp-2 px-4 text-xs leading-5 font-normal text-body">
            <HighlightText text={metadata.description} tokens={tokens} />
          </p>
        )}

        <div className="mt-auto pt-3.5">
          <div className="flex items-center justify-between gap-2 border-t border-line-subtle px-4 py-2.5">
            {serviceCount === undefined ? (
              <span
                className="block h-4 w-20 animate-pulse rounded bg-surface-3"
                aria-hidden
              />
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-normal text-body">
                <PanelTop size={13} strokeWidth={2} aria-hidden />
                <span>
                  <span className="tabular-nums">
                    {serviceCount.toLocaleString()}
                  </span>{" "}
                  {serviceCount === 1 ? "Service" : "Services"}
                </span>
              </span>
            )}
            <span className="text-xs font-semibold text-muted transition-colors group-hover/card:text-strong">
              View Services
            </span>
          </div>
        </div>
      </Link>
    </li>
  );
};

const NamespaceGridSkeleton = () => (
  <div
    role="status"
    aria-label="Loading Namespaces"
    className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
  >
    {Array.from({ length: 6 }, (_, index) => (
      <div
        key={index}
        className="h-[132px] rounded-xl border border-line bg-surface px-4 pt-3.5 shadow-surface"
      >
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 animate-pulse rounded-lg bg-surface-3" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 w-1/3 animate-pulse rounded bg-surface-3" />
            <div className="h-2.5 w-1/2 animate-pulse rounded bg-surface-2" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const NamespaceList = (props: { domain: string }) => {
  const { domain } = props;
  const { searchParams, setParams } = useFilterParams();
  const itemsPerPage = useAppSelector((state) => state.prefs.prefs.itemsPerPage);

  const search = searchParams.get("search") ?? "";
  const page = getPage(searchParams.get("common.page"));

  const tokens = React.useMemo(() => tokenizeQuery(search), [search]);
  const isSearching = tokens.length > 0;

  const query = useQuery({
    queryKey: [
      "user/listNamespace",
      domain,
      isSearching ? "all" : page,
      isSearching ? "all" : itemsPerPage,
    ],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      if (isSearching) {
        const items = await listAllNamespaces(domain);
        return { items, listResponseMeta: undefined };
      }
      const { response } = await getClientUser(domain).listNamespace(
        ListNamespaceOptions.create({
          common: {
            page,
            itemsPerPage,
            orderBy: ORDER_BY_NAME,
          },
        }),
      );
      return response;
    },
  });

  const items = React.useMemo(() => {
    const ret = query.data?.items ?? [];
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
  }, [isSearching, query.data, tokens]);

  const serviceCounts = useQueries({
    queries: items.map((item) => {
      const name = item.metadata?.name ?? "";
      return {
        queryKey: ["user/listService.count", domain, name],
        queryFn: async () => {
          const { response } = await getClientUser(domain).listService(
            ListServiceOptions.create({
              common: { page: 0, itemsPerPage: 1 },
              namespace: name,
            }),
          );
          return response.listResponseMeta?.totalCount ?? 0;
        },
        enabled: name !== "",
        retry: false,
        staleTime: 60 * 1000,
      };
    }),
  });

  const totalCount = isSearching
    ? undefined
    : query.data?.listResponseMeta?.totalCount;

  return (
    <div className="w-full">
      <PageHeader
        title="Namespaces"
        addon={
          totalCount !== undefined && (
            <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-micro font-semibold text-body tabular-nums">
              {totalCount.toLocaleString()}
            </span>
          )
        }
        description={`The Namespaces you are authorized to access at ${domain}`}
        actions={
          <RefreshButton
            label="Refresh the Namespaces"
            loading={query.isFetching && !query.isPending}
            onClick={() => void query.refetch()}
          />
        }
      />

      <FilterBar label="Namespaces">
        <SearchField
          label="Search Namespaces"
          value={search}
          onChange={(value) => setParams({ search: value || null }, { replace: true })}
          placeholder="Search by name or description"
        />
      </FilterBar>

      {query.isPending && <NamespaceGridSkeleton />}

      {query.isError && !query.data && (
        <ErrorState
          title="Unable to load the Namespaces"
          message="The Cluster API could not be reached. Check that you are still signed in."
          onRetry={() => query.refetch()}
        />
      )}

      {query.data && (
        <div
          className={twMerge(
            "transition-opacity duration-200",
            query.isPlaceholderData && "opacity-60",
          )}
          aria-busy={query.isPlaceholderData || undefined}
        >
          {items.length < 1 ? (
            <EmptyState
              title={isSearching ? "No matching Namespaces" : "No Namespace"}
              message={
                isSearching
                  ? `Nothing matched “${search}”.`
                  : "You are not authorized to access any Namespace yet."
              }
              icon={
                isSearching ? (
                  <SearchX size={18} aria-hidden />
                ) : (
                  <Boxes size={18} aria-hidden />
                )
              }
            />
          ) : (
            <ul
              aria-label="Namespaces"
              className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3"
            >
              {items.map((itm, index) => (
                <NamespaceCard
                  key={itm.metadata?.uid ?? itm.metadata?.name}
                  item={itm}
                  serviceCount={serviceCounts[index]?.data}
                  tokens={tokens}
                />
              ))}
            </ul>
          )}

          {isSearching ? (
            items.length > 0 && (
              <p className="mt-5 text-xs font-normal text-body tabular-nums">
                {items.length.toLocaleString()}{" "}
                {items.length === 1 ? "Namespace matches" : "Namespaces match"}
              </p>
            )
          ) : (
            <Paginator meta={query.data.listResponseMeta}>
              <PageSizeSelect />
            </Paginator>
          )}
        </div>
      )}
    </div>
  );
};

const List = () => (
  <RequireDomain>{(domain) => <NamespaceList domain={domain} />}</RequireDomain>
);

export default List;
