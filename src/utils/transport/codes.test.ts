import { expect, test } from "vitest";

import { getGrpcCode } from "./codes";

test("getGrpcCode", () => {
  {
    expect(getGrpcCode(0)).toEqual("OK");
  }
  {
    expect(getGrpcCode(5)).toEqual("NOT_FOUND");
  }
  {
    expect(getGrpcCode(9)).toEqual("FAILED_PRECONDITION");
  }
  {
    expect(getGrpcCode(16)).toEqual("UNAUTHENTICATED");
  }
  {
    expect(getGrpcCode(17)).toEqual("UNKNOWN");
  }
  {
    expect(getGrpcCode(-1)).toEqual("UNKNOWN");
  }
  {
    expect(getGrpcCode(undefined)).toEqual("UNKNOWN");
  }
});
