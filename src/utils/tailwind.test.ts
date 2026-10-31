import { expect, test } from "vitest";

import { twMerge } from "./tailwind";

test("twMerge keeps the custom font sizes next to text colors", () => {
  {
    expect(twMerge("text-ui text-body", "text-strong")).toEqual("text-ui text-strong");
  }
  {
    expect(twMerge("text-micro text-emerald-700")).toEqual("text-micro text-emerald-700");
  }
  {
    expect(twMerge("text-ui", "text-micro")).toEqual("text-micro");
  }
});

test("twMerge resolves the custom shadows", () => {
  {
    expect(twMerge("shadow-card", "shadow-raised")).toEqual("shadow-raised");
  }
  {
    expect(twMerge("shadow-card border-line", "border-line-strong")).toEqual("shadow-card border-line-strong");
  }
});
