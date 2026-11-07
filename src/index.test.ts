/// <reference types="node" />

import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

import { NATIVE_APPEARANCE } from "@/utils/native/theme";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const css = read("./index.css");
const main = read("./main.tsx");
const pkg = read("../package.json");

test("the application uses Plus Jakarta Sans and JetBrains Mono", () => {
  expect(css).toMatch(/--font-sans:\s+"Plus Jakarta Sans",/);
  expect(css).toMatch(/--font-mono:\s+"JetBrains Mono",/);
  expect(main).toContain("@fontsource/plus-jakarta-sans/500.css");
  expect(main).toContain("@fontsource/jetbrains-mono/400.css");
});

test("no trace of Ubuntu remains", () => {
  for (const content of [css, main, pkg]) {
    expect(content.toLowerCase()).not.toContain("ubuntu");
  }
});

test("monospace text keeps a regular weight without ligatures", () => {
  expect(css).toMatch(
    /\.font-mono \{\s+font-variant-ligatures: none;\s+font-weight: 400;/,
  );
});

test("the dark theme uses the neutral palette of the Octelium portal", () => {
  const dark = /\[data-theme="dark"\] \{[^}]*\}/.exec(css)?.[0];
  expect(dark).toContain("--oct-app: oklch(13.5% 0.002 270);");
  expect(dark).toContain("--oct-surface: oklch(17% 0.002 270);");
  expect(dark).toContain("--oct-line: oklch(26% 0.002 270);");
  expect(dark).toContain("--oct-strong: oklch(96% 0.002 270);");
});

test("the native dark window matches the page background", () => {
  expect(NATIVE_APPEARANCE.dark.background).toBe("#080809");
});
