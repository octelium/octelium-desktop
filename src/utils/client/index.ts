import * as DaemonGRPC from "@/gen/client/daemonv1";
import { TauriTransport } from "@/utils/transport";
import * as UserGRPC from "@octelium/apis/main/userv1";
import { invoke } from "@tauri-apps/api/core";

let daemonTransport: TauriTransport | undefined;
const clusterTransports = new Map<string, TauriTransport>();

const getDaemonTransport = (): TauriTransport => {
  if (!daemonTransport) {
    daemonTransport = new TauriTransport({ target: "daemon" });
  }

  return daemonTransport;
};

const getClusterTransport = (domain: string): TauriTransport => {
  let ret = clusterTransports.get(domain);
  if (!ret) {
    ret = new TauriTransport({ target: "cluster", getDomain: () => domain });
    clusterTransports.set(domain, ret);
  }

  return ret;
};

export const getClientDaemon = (): DaemonGRPC.MainServiceClient => {
  return new DaemonGRPC.MainServiceClient(getDaemonTransport());
};

export const getClientUser = (domain: string): UserGRPC.MainServiceClient => {
  return new UserGRPC.MainServiceClient(getClusterTransport(domain));
};

export const invalidateDomainClient = async (domain: string): Promise<void> => {
  clusterTransports.delete(domain);
  await invoke("grpc_invalidate_domain", { domain });
};
