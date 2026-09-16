import { expect, test } from "vitest";
import { getPage } from "./resources";

test("getPage", () => {
  expect(getPage(null)).toBe(0);
  expect(getPage("3")).toBe(3);
  expect(getPage("-1")).toBe(0);
  expect(getPage("1.5")).toBe(0);
  expect(getPage("invalid")).toBe(0);
});
