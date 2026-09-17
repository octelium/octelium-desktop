import { describe, expect, it } from "vitest";
import { getReleaseVersion, normalizeVersionTag } from ".";

describe("normalizeVersionTag", () => {
  it("normalizes conventional release tags", () => {
    expect(normalizeVersionTag(" v1.2.3 ")).toBe("1.2.3");
  });

  it("keeps readable non-semver tags", () => {
    expect(normalizeVersionTag("desktop-preview")).toBe("desktop-preview");
  });

  it("rejects unavailable or unsafe values", () => {
    expect(normalizeVersionTag(undefined)).toBeUndefined();
    expect(normalizeVersionTag("")).toBeUndefined();
    expect(normalizeVersionTag("v1.2.3\ninvalid")).toBeUndefined();
  });
});

describe("getReleaseVersion", () => {
  it("reads a GitHub release tag", () => {
    expect(getReleaseVersion({ tag_name: "v2.0.1" })).toBe("2.0.1");
  });

  it("ignores malformed responses", () => {
    expect(getReleaseVersion({ tag: "v2.0.1" })).toBeUndefined();
    expect(getReleaseVersion(null)).toBeUndefined();
  });
});
