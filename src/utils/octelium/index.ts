import * as UserPB from "@octelium/apis/main/userv1";

export const getServicePrivateFQDN = (
  arg: UserPB.Service,
  domain: string,
): string => {
  return arg.status!.primaryHostname !== ""
    ? `${arg.status!.primaryHostname}.local.${domain}`
    : `local.${domain}`;
};

export const getServicePublicFQDN = (
  arg: UserPB.Service,
  domain: string,
): string => {
  return arg.status!.primaryHostname !== ""
    ? `${arg.status!.primaryHostname}.${domain}`
    : `${domain}`;
};

export const getServicePublicURL = (
  arg: UserPB.Service,
  domain: string,
): string => {
  return `https://${getServicePublicFQDN(arg, domain)}`;
};

export const getServiceHostname = (arg: UserPB.Service): string =>
  arg.status?.primaryHostname || arg.metadata?.name || "";

export const isServiceWebBrowsable = (arg: UserPB.Service): boolean => {
  switch (arg.spec?.type) {
    case UserPB.Service_Spec_Type.WEB:
    case UserPB.Service_Spec_Type.HTTP:
    case UserPB.Service_Spec_Type.RDP_WEB:
      return true;
    default:
      return false;
  }
};

export const getUserDisplayName = (
  arg?: UserPB.GetStatusResponse,
): string | undefined =>
  arg?.user?.metadata?.displayName?.trim() ||
  arg?.user?.metadata?.name?.trim() ||
  undefined;

export const getUserPicURL = (
  arg?: UserPB.GetStatusResponse,
): string | undefined =>
  arg?.session?.metadata?.picURL || arg?.user?.metadata?.picURL || undefined;
