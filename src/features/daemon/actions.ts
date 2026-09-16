import {
  AuthenticateRequest,
  CancelOperationRequest,
  ConnectRequest,
  DeleteDomainRequest,
  DisconnectRequest,
  LogoutRequest,
  UpdateDomainSettingsRequest,
  type ConnectionOptions,
  type DomainSettings,
  type Operation,
} from "@/gen/client/daemonv1";
import { getClientDaemon } from "@/utils/client";
import { clearDomainSession } from "@/utils/session";
import { getRpcError } from "@/utils/transport";

export const API_MAJOR_VERSION = 1;

export const authenticateBrowser = async (
  domain: string,
  scopes?: string[],
): Promise<Operation> => {
  const { response } = await getClientDaemon().authenticate(
    AuthenticateRequest.create({
      domain,
      scopes: scopes ?? [],
      type: { oneofKind: "browser", browser: {} },
    }),
  );

  await clearDomainSession(response.domain || domain);
  return response;
};

export const authenticateToken = async (
  domain: string,
  authenticationToken: string,
  scopes?: string[],
): Promise<Operation> => {
  const { response } = await getClientDaemon().authenticate(
    AuthenticateRequest.create({
      domain,
      scopes: scopes ?? [],
      type: {
        oneofKind: "authenticationToken",
        authenticationToken: { authenticationToken },
      },
    }),
  );

  await clearDomainSession(response.domain || domain);
  return response;
};

export const connect = async (
  domain: string,
  options?: ConnectionOptions,
): Promise<Operation> => {
  const { response } = await getClientDaemon().connect(
    ConnectRequest.create({ domain, options }),
  );

  return response;
};

export const disconnect = async (domain: string): Promise<Operation> => {
  const { response } = await getClientDaemon().disconnect(
    DisconnectRequest.create({ domain }),
  );

  return response;
};

export const logout = async (domain: string): Promise<Operation> => {
  const { response } = await getClientDaemon().logout(
    LogoutRequest.create({ domain }),
  );

  await clearDomainSession(domain);
  return response;
};

export const deleteDomain = async (domain: string): Promise<Operation> => {
  const { response } = await getClientDaemon().deleteDomain(
    DeleteDomainRequest.create({ domain }),
  );

  await clearDomainSession(domain);
  return response;
};

export const cancelOperation = async (id: string): Promise<Operation> => {
  const { response } = await getClientDaemon().cancelOperation(
    CancelOperationRequest.create({ id }),
  );

  return response;
};

export const updateDomainSettings = async (
  domain: string,
  settings: DomainSettings,
): Promise<DomainSettings> => {
  const { response } = await getClientDaemon().updateDomainSettings(
    UpdateDomainSettingsRequest.create({ domain, settings }),
  );

  return response;
};

export const getErrorMessage = (arg: unknown): string => {
  const err = getRpcError(arg);
  return err.message !== "" ? err.message : err.code;
};
