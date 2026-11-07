import { createElement } from "react";
import { MantineProvider } from "@mantine/core";
import { LogIn } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";

import ActionButton from ".";

const render = (props: Partial<Parameters<typeof ActionButton>[0]> = {}) =>
  renderToStaticMarkup(
    createElement(
      MantineProvider,
      { env: "test" },
      createElement(ActionButton, {
        label: "Continue in browser",
        Icon: LogIn,
        ...props,
      }),
    ),
  );

test("ActionButton keeps the brand color in the light theme only", () => {
  const html = render();
  expect(html).toContain("bg-brand");
  expect(html).toContain("dark:bg-surface");
  expect(html).toContain("Continue in browser");
});

test("ActionButton uses a surface for the quiet action", () => {
  const html = render({ quiet: true });
  expect(html).toContain("bg-surface");
  expect(html).not.toContain("bg-brand ");
});

test("ActionButton dims a disabled action unless it is pending", () => {
  expect(render({ disabled: true })).toContain("opacity-50");
  const pending = render({ disabled: true, pending: true });
  expect(pending).not.toContain("opacity-50");
  expect(pending).toContain('aria-busy="true"');
});
