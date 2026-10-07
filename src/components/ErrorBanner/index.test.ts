import { Error_Code, Error as DaemonError } from "@/gen/client/daemonv1";
import { MantineProvider } from "@mantine/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";

import ErrorBanner from ".";

test("ErrorBanner offers sign in for unusable credentials even when retry is disabled", () => {
  const markup = renderToStaticMarkup(createElement(MantineProvider, null,
    createElement(ErrorBanner, {
      error: DaemonError.create({ code: Error_Code.AUTHENTICATION_REQUIRED }),
      onSignIn: vi.fn(),
      onRetry: vi.fn(),
    }),
  ));

  expect(markup).toContain("Sign in again");
  expect(markup).not.toContain("Try again");
});

test("ErrorBanner keeps retry for other retryable errors", () => {
  const markup = renderToStaticMarkup(createElement(MantineProvider, null,
    createElement(ErrorBanner, {
      error: DaemonError.create({ code: Error_Code.CLUSTER_UNREACHABLE, retryable: true }),
      onSignIn: vi.fn(),
      onRetry: vi.fn(),
    }),
  ));

  expect(markup).toContain("Try again");
  expect(markup).not.toContain("Sign in again");
});

test("ErrorBanner disables sign in while another operation is active", () => {
  const markup = renderToStaticMarkup(createElement(MantineProvider, null,
    createElement(ErrorBanner, {
      error: DaemonError.create({ code: Error_Code.AUTHENTICATION_REQUIRED }),
      onSignIn: vi.fn(),
      disabled: true,
    }),
  ));

  expect(markup).toMatch(/<button[^>]*disabled/);
});
