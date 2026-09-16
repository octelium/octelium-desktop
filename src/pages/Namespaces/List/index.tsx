import {
  EmptyState,
  ErrorState,
  ResourceListSkeleton,
} from "@/components/AsyncState";
import InfoItem from "@/components/InfoItem";
import PageHeader from "@/components/PageHeader";
import PageSizeSelect from "@/components/PageSizeSelect";
import Paginator from "@/components/Paginator";
import RequireDomain from "@/components/RequireDomain";
import {
  ResourceListItem,
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
import { useQuery } from "@tanstack/react-query";
import { Boxes, PanelTop, SearchX } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";

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

  const tokens = tokenizeQuery(search);
  const isSearching = tokens.length > 0;

  const query = useQuery({
    queryKey: [
      "user/listNamespace",
      domain,
      isSearching ? "all" : page,
      isSearching ? "all" : itemsPerPage,
    ],
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

  return (
    <div className="w-full">
      <PageHeader
        title="Namespaces"
        description={`The Namespaces you are authorized to access at ${domain}`}
        actions={<PageSizeSelect />}
      />

      <div className="mb-5">
        <SearchField
          value={search}
          onChange={(value) => setParams({ search: value || null })}
          placeholder="Search the Namespaces…"
        />
      </div>

      {query.isPending && <ResourceListSkeleton />}

      {query.isError && (
        <ErrorState
          title="Unable to load the Namespaces"
          message="The Cluster API could not be reached. Check that you are still signed in."
          onRetry={() => query.refetch()}
        />
      )}

      {query.isSuccess && items.length < 1 && (
        <EmptyState
          title={isSearching ? "Nothing found" : "No Namespace"}
          message={
            isSearching
              ? "No Namespace matches your search in this Cluster."
              : "You are not authorized to access any Namespace yet."
          }
          icon={isSearching ? <SearchX size={22} aria-hidden /> : <Boxes size={22} aria-hidden />}
        />
      )}

      {items.length > 0 && (
        <ResourceListWrapper>
          {items.map((itm) => (
            <ResourceListItem key={itm.metadata?.uid ?? itm.metadata?.name}>
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-zinc-900 text-white shadow-xs ring-1 ring-zinc-700/80 transition-transform duration-200 group-hover/item:scale-[1.04] dark:bg-slate-700 dark:ring-slate-600">
                  <Boxes size={22} aria-hidden />
                </div>

                <div className="min-w-0 flex-1">
                  <ResourceName
                    name={itm.metadata?.name ?? ""}
                    displayName={itm.metadata?.displayName}
                    highlight={tokens}
                  />

                  {itm.metadata?.description && (
                    <p className="mt-1 text-sm font-medium text-muted">
                      {itm.metadata.description}
                    </p>
                  )}

                  <dl className="mt-3">
                    <InfoItem title="Created">
                      <TimeAgo
                        rfc3339={
                          itm.metadata?.createdAt
                            ? toRFC3339(itm.metadata.createdAt)
                            : undefined
                        }
                      />
                    </InfoItem>
                  </dl>
                </div>

                <Button
                  size="xs"
                  variant="outline"
                  className="flex-none"
                  leftSection={<PanelTop size={14} aria-hidden />}
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

      {!isSearching && <Paginator meta={query.data?.listResponseMeta} />}
    </div>
  );
};

const List = () => (
  <RequireDomain>{(domain) => <NamespaceList domain={domain} />}</RequireDomain>
);

export default List;
