const CODES = [
  "OK",
  "CANCELLED",
  "UNKNOWN",
  "INVALID_ARGUMENT",
  "DEADLINE_EXCEEDED",
  "NOT_FOUND",
  "ALREADY_EXISTS",
  "PERMISSION_DENIED",
  "RESOURCE_EXHAUSTED",
  "FAILED_PRECONDITION",
  "ABORTED",
  "OUT_OF_RANGE",
  "UNIMPLEMENTED",
  "INTERNAL",
  "UNAVAILABLE",
  "DATA_LOSS",
  "UNAUTHENTICATED",
] as const;

export type GrpcCode = (typeof CODES)[number];

export const getGrpcCode = (arg?: number): GrpcCode => {
  if (arg === undefined || arg < 0 || arg >= CODES.length) {
    return "UNKNOWN";
  }

  return CODES[arg];
};
