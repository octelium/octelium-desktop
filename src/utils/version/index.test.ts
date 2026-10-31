import { describe, expect, it } from "vitest";
import { getReleaseVersion, isNewerVersion, normalizeVersionTag } from ".";

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

describe("isNewerVersion", () => {
  it("detects a newer release", () => {
    expect(isNewerVersion("1.0.0", "0.2.8")).toBe(true);
    expect(isNewerVersion("0.2.10", "0.2.9")).toBe(true);
    expect(isNewerVersion("0.3.0", "0.2.99")).toBe(true);
  });

  it("ignores the same or an older release", () => {
    expect(isNewerVersion("0.2.8", "0.2.8")).toBe(false);
    expect(isNewerVersion("0.2.7", "0.2.8")).toBe(false);
    expect(isNewerVersion("0.10.0", "1.0.0")).toBe(false);
  });

  it("ignores unknown or non-semver versions", () => {
    expect(isNewerVersion(undefined, "0.2.8")).toBe(false);
    expect(isNewerVersion(null, "0.2.8")).toBe(false);
    expect(isNewerVersion("1.0.0", undefined)).toBe(false);
    expect(isNewerVersion("desktop-preview", "0.2.8")).toBe(false);
    expect(isNewerVersion("1.0.0-rc.1", "0.2.8")).toBe(false);
  });
});
