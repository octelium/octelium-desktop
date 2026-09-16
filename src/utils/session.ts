import { queryClient } from "@/utils";
import { invalidateDomainClient } from "@/utils/client";
import { isNative } from "@/utils/native";

export const clearDomainSession = async (domain: string): Promise<void> => {
  queryClient.removeQueries({
    predicate: (query) => query.queryKey[1] === domain,
  });

  if (isNative()) {
    await invalidateDomainClient(domain);
  }
};
