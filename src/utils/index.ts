import type { Metadata } from "@octelium/apis/main/metav1";
import { Timestamp } from "@octelium/apis/google/protobuf/timestamp";
import { QueryClient } from "@tanstack/react-query";

const isDevVal = import.meta.env.MODE === "development";

export function isDev(): boolean {
  return isDevVal;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const printResourceNameWithDisplay = (arg: Metadata) => {
  return arg.displayName ? `${arg.name} (${arg.displayName})` : arg.name;
};

export const toRFC3339 = (arg?: Timestamp): string | undefined =>
  arg ? Timestamp.toDate(arg).toISOString() : undefined;

export const printDuration = (from?: Timestamp, to?: Date): string => {
  if (!from) {
    return "";
  }

  const seconds = Math.max(
    0,
    Math.floor(
      ((to ?? new Date()).getTime() - Timestamp.toDate(from).getTime()) / 1000,
    ),
  );

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }

  return `${seconds}s`;
};

export const truncateUtf8 = (
  input: string,
  maxBytes: number,
  options?: { suffix?: string },
) => {
  if (maxBytes <= 0) return "";

  const encoder = new TextEncoder();

  const suffix = options?.suffix ?? "";
  const suffixBytes = suffix ? encoder.encode(suffix).length : 0;

  const totalBytes = encoder.encode(input).length;
  if (totalBytes <= maxBytes) return input;

  const allowedForBody = Math.max(0, maxBytes - suffixBytes);

  let out = "";
  let used = 0;

  for (const ch of input) {
    const b = encoder.encode(ch).length;
    if (used + b > allowedForBody) break;
    out += ch;
    used += b;
  }

  if (suffix && used + suffixBytes <= maxBytes) {
    return out + suffix;
  }

  return out;
};

export const tokenizeQuery = (query: string): string[] =>
  query.trim().toLowerCase().split(/\s+/).filter(Boolean);

export const matchesAllTokens = (haystack: string, tokens: string[]): boolean =>
  tokens.every((token) => haystack.includes(token));
