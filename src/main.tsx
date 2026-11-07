import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "@mantine/core/styles.layer.css";

import { Provider } from "react-redux";
import { RouterProvider } from "react-router-dom";

import store from "@/store";

import AppTheme from "@/components/AppTheme";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import router from "@/router";
import { isDev, queryClient } from "@/utils";
import { isNative } from "@/utils/native";
import { QueryClientProvider } from "@tanstack/react-query";
import { platform } from "@tauri-apps/plugin-os";

if (isNative()) {
  document.documentElement.setAttribute("data-platform", platform());
}

if (!isDev()) {
  document.addEventListener("contextmenu", (event) => {
    const target = event.target as HTMLElement | null;
    if (!target?.closest("input, textarea, [data-selectable]")) {
      event.preventDefault();
    }
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <Provider store={store}>
        <AppTheme>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router()} />
          </QueryClientProvider>
        </AppTheme>
      </Provider>
    </AppErrorBoundary>
  </React.StrictMode>,
);
