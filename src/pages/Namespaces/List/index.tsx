import {
  EmptyState,
  ErrorState,
  ResourceListSkeleton,
} from "@/components/AsyncState";
import { IconTile } from "@/components/Card";
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
import ResourceName from "@/components/ResourceName";
import SearchField from "@/components/SearchField";
import TimeAgo from "@/components/TimeAgo";
import { matchesAllTokens, toRFC3339, tokenizeQuery } from "@/utils";
import { getClientUser } from "@/utils/client";
import { useAppSelector, useFilterParams } from "@/utils/hooks";
import { getPage, listAllNamespaces } from "@/utils/resources";
import { Button } from "@mantine/core";
import {
  CommonListOptions_OrderBy_Mode,
  CommonListOptions_OrderBy_Type,
} from "@octelium/apis/main/metav1";
import { ListNamespaceOptions } from "@octelium/apis/main/userv1";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowRight, Boxes, Clock, SearchX } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { twMerge } from "@/utils/tailwind";

const ORDER_BY_NAME = {
  type: CommonListOptions_OrderBy_Type.NAME,
  mode: CommonListOptions_OrderBy_Mode.ASC,
};

const NamespaceList = (props: { domain: string }) => {
  const { domain } = props;
  const navigate = useNavigate();
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

  const totalCount = isSearching
    ? undefined
    : query.data?.listResponseMeta?.totalCount;

  return (
    <div className="w-full">
      <PageHeader
        title="Namespaces"
        addon={
          totalCount !== undefined && (
            <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-micro font-medium text-muted tabular-nums">
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

      <div className="mb-4">
        <SearchField
          label="Search the Namespaces"
          value={search}
          onChange={(value) => setParams({ search: value || null }, { replace: true })}
          placeholder="Search by name, display name or description"
        />
      </div>

      {query.isPending && <ResourceListSkeleton />}

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
            <ResourceListWrapper>
              {items.map((itm) => (
                <ResourceListItem key={itm.metadata?.uid ?? itm.metadata?.name}>
                  <div className="flex items-start gap-3 px-4 py-3.5">
                    <IconTile>
                      <Boxes size={16} aria-hidden />
                    </IconTile>

                    <div className="min-w-0 flex-1">
                      <ResourceName
                        name={itm.metadata?.name ?? ""}
                        displayName={itm.metadata?.displayName}
                        description={itm.metadata?.description}
                        highlight={tokens}
                      />

                      {itm.metadata?.createdAt && (
                        <ResourceListLabelWrap className="mt-2">
                          <ResourceListLabel
                            icon={<Clock aria-hidden />}
                            title={toRFC3339(itm.metadata.createdAt)}
                          >
                            Created{" "}
                            <TimeAgo rfc3339={toRFC3339(itm.metadata.createdAt)} />
                          </ResourceListLabel>
                        </ResourceListLabelWrap>
                      )}
                    </div>

                    <Button
                      size="xs"
                      variant="default"
                      className="flex-none"
                      rightSection={<ArrowRight size={13} aria-hidden />}
                      onClick={() =>
                        navigate(
                          `/services?namespace=${encodeURIComponent(itm.metadata?.name ?? "")}`,
                        )
                      }
                    >
                      Services
                    </Button>
                  </div>
                </ResourceListItem>
              ))}
            </ResourceListWrapper>
          )}

          {isSearching ? (
            items.length > 0 && (
              <p className="mt-4 text-xs text-muted tabular-nums">
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
