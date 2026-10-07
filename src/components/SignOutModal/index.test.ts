import ConfirmModal from "@/components/ConfirmModal";
import { logout } from "@/features/daemon/actions";
import { Operation } from "@/gen/client/daemonv1";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";

import SignOutModal from ".";

vi.mock("@/components/ConfirmModal", () => ({ default: vi.fn(() => null) }));
vi.mock("@/features/daemon/actions", () => ({
  logout: vi.fn(),
  getErrorMessage: vi.fn(),
}));

test("SignOutModal signs out the requested Cluster only after confirmation", async () => {
  const onClose = vi.fn();
  vi.mocked(logout).mockResolvedValue(Operation.create());
  renderToStaticMarkup(
    createElement(QueryClientProvider, { client: new QueryClient() },
      createElement(SignOutModal, { domain: "example.com", onClose }),
    ),
  );

  const props = vi.mocked(ConfirmModal).mock.calls[0][0];
  expect(props.opened).toBe(true);
  expect(props.title).toBe("Sign out");
  expect(logout).not.toHaveBeenCalled();

  props.onConfirm();

  await vi.waitFor(() => {
    expect(logout).toHaveBeenCalledWith("example.com");
    expect(onClose).toHaveBeenCalledOnce();
  });
});
