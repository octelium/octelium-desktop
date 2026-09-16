import { expect, test } from "vitest";

import {
  matchesAllTokens,
  printDuration,
  printResourceNameWithDisplay,
  toRFC3339,
  tokenizeQuery,
  truncateUtf8,
} from ".";

test("toRFC3339", () => {
  {
    expect(toRFC3339(undefined)).toBeUndefined();
  }
  {
    const ret = toRFC3339({ seconds: 1700000000, nanos: 0 });
    expect(ret).toEqual("2023-11-14T22:13:20.000Z");
  }
});

test("printDuration", () => {
  const to = new Date(1700000000 * 1000);

  {
    expect(printDuration(undefined, to)).toEqual("");
  }
  {
    const ret = printDuration({ seconds: 1700000000 - 45, nanos: 0 }, to);
    expect(ret).toEqual("45s");
  }
  {
    const ret = printDuration({ seconds: 1700000000 - 125, nanos: 0 }, to);
    expect(ret).toEqual("2m 5s");
  }
  {
    const ret = printDuration({ seconds: 1700000000 - 5400, nanos: 0 }, to);
    expect(ret).toEqual("1h 30m");
  }
  {
    const ret = printDuration({ seconds: 1700000000 - 100000, nanos: 0 }, to);
    expect(ret).toEqual("1d 3h");
  }
  {
    const ret = printDuration({ seconds: 1700000000 + 60, nanos: 0 }, to);
    expect(ret).toEqual("0s");
  }
});

test("printResourceNameWithDisplay", () => {
  {
    const ret = printResourceNameWithDisplay({
      name: "svc",
      displayName: "The Service",
    } as never);
    expect(ret).toEqual("svc (The Service)");
  }
  {
    const ret = printResourceNameWithDisplay({ name: "svc" } as never);
    expect(ret).toEqual("svc");
  }
});

test("tokenizeQuery", () => {
  {
    expect(tokenizeQuery("")).toEqual([]);
  }
  {
    expect(tokenizeQuery("  Foo   BAR ")).toEqual(["foo", "bar"]);
  }
});

test("matchesAllTokens", () => {
  {
    expect(matchesAllTokens("grafana.default", ["gra", "def"])).toBe(true);
  }
  {
    expect(matchesAllTokens("grafana.default", ["gra", "prod"])).toBe(false);
  }
  {
    expect(matchesAllTokens("grafana.default", [])).toBe(true);
  }
});

test("truncateUtf8", () => {
  {
    expect(truncateUtf8("abcdef", 0)).toEqual("");
  }
  {
    expect(truncateUtf8("abcdef", 100)).toEqual("abcdef");
  }
  {
    expect(truncateUtf8("abcdef", 5, { suffix: "..." })).toEqual("ab...");
  }
});
