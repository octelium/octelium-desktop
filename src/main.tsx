import "@fontsource/ubuntu/latin-400.css";
import "@fontsource/ubuntu/latin-500.css";
import "@fontsource/ubuntu/latin-700.css";
import "@mantine/core/styles.css";
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import { Provider } from "react-redux";
import { RouterProvider } from "react-router-dom";

import store from "@/store";

import AppTheme from "@/components/AppTheme";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import router from "@/router";
import { queryClient } from "@/utils";
import { QueryClientProvider } from "@tanstack/react-query";

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
