import { getClientUser } from "@/utils/client";
import {
  CommonListOptions_OrderBy_Mode,
  CommonListOptions_OrderBy_Type,
} from "@octelium/apis/main/metav1";
import {
  ListNamespaceOptions,
  ListServiceOptions,
  type Namespace,
  type Service,
  Service_Spec_Type,
} from "@octelium/apis/main/userv1";

const ITEMS_PER_PAGE = 100;
const MAX_PAGES = 1000;

const ORDER_BY_NAME = {
  type: CommonListOptions_OrderBy_Type.NAME,
  mode: CommonListOptions_OrderBy_Mode.ASC,
};

export const listAllServices = async (
  domain: string,
  options?: { namespace?: string; type?: Service_Spec_Type },
): Promise<Service[]> => {
  const items: Service[] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { response } = await getClientUser(domain).listService(
      ListServiceOptions.create({
        common: { page, itemsPerPage: ITEMS_PER_PAGE, orderBy: ORDER_BY_NAME },
        namespace: options?.namespace ?? "",
        type: options?.type ?? Service_Spec_Type.UNSET,
      }),
    );
    items.push(...response.items);

    if (!response.listResponseMeta?.hasMore || response.items.length === 0) {
      return items;
    }
  }

  throw new Error("The Service list exceeded the supported pagination range");
};

export const listAllNamespaces = async (domain: string): Promise<Namespace[]> => {
  const items: Namespace[] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const { response } = await getClientUser(domain).listNamespace(
      ListNamespaceOptions.create({
        common: { page, itemsPerPage: ITEMS_PER_PAGE, orderBy: ORDER_BY_NAME },
      }),
    );
    items.push(...response.items);

    if (!response.listResponseMeta?.hasMore || response.items.length === 0) {
      return items;
    }
  }

  throw new Error("The Namespace list exceeded the supported pagination range");
};

export const getPage = (value: string | null): number => {
  const page = Number(value ?? "0");
  return Number.isSafeInteger(page) && page >= 0 ? page : 0;
};
