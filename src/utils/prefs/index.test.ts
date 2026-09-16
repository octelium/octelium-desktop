import { expect, test } from "vitest";

import { defaultPrefs, normalizePrefs, resolveTheme } from ".";

test("normalizePrefs", () => {
  {
    expect(normalizePrefs(undefined)).toEqual(defaultPrefs);
  }
  {
    expect(normalizePrefs(null)).toEqual(defaultPrefs);
  }
  {
    const ret = normalizePrefs({ theme: "dark", itemsPerPage: 25 });
    expect(ret.theme).toEqual("dark");
    expect(ret.itemsPerPage).toEqual(25);
    expect(ret.closeToTray).toEqual(defaultPrefs.closeToTray);
  }
  {
    const ret = normalizePrefs({ theme: "neon" as never, itemsPerPage: 7 });
    expect(ret.theme).toEqual("system");
    expect(ret.itemsPerPage).toEqual(10);
  }
  {
    const ret = normalizePrefs({ primaryDomain: "" });
    expect(ret.primaryDomain).toBeUndefined();
  }
  {
    const ret = normalizePrefs({ lastDomain: "example.com" } as never);
    expect(ret.primaryDomain).toEqual("example.com");
    expect(ret).not.toHaveProperty("lastDomain");
  }
  {
    const ret = normalizePrefs({ primaryDomain: " Example.COM " });
    expect(ret.primaryDomain).toEqual("example.com");
  }
  {
    const ret = normalizePrefs({ notifications: "yes" } as never);
    expect(ret.notifications).toEqual(defaultPrefs.notifications);
  }
});

test("resolveTheme", () => {
  {
    expect(resolveTheme("light", true)).toEqual("light");
  }
  {
    expect(resolveTheme("dark", false)).toEqual("dark");
  }
  {
    expect(resolveTheme("system", true)).toEqual("dark");
  }
  {
    expect(resolveTheme("system", false)).toEqual("light");
  }
});
