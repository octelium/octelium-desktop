/* eslint-disable react-refresh/only-export-components */

import Loading from "@/components/Loading";
import { lazy, Suspense } from "react";
import { Navigate, type RouteObject } from "react-router-dom";
import Root from "./index";
import routerNamespaces from "./Namespaces/router";
import routerServices from "./Services/router";

const Connection = lazy(() => import("./Connection"));
const Settings = lazy(() => import("./Settings"));
const Diagnostics = lazy(() => import("./Diagnostics"));

const withSuspense = (element: React.ReactNode) => (
  <Suspense fallback={<Loading />}>{element}</Suspense>
);

export default (): RouteObject => {
  return {
    path: "/",
    element: <Root />,
    children: [
      {
        path: "",
        element: <Navigate to="/connection" replace />,
      },
      {
        path: "connection",
        element: withSuspense(<Connection />),
      },
      routerServices(),
      routerNamespaces(),
      {
        path: "clusters",
        element: <Navigate to="/settings?section=clusters" replace />,
      },
      {
        path: "settings",
        element: withSuspense(<Settings />),
      },
      {
        path: "diagnostics",
        element: withSuspense(<Diagnostics />),
      },
      {
        path: "*",
        element: <Navigate to="/connection" replace />,
      },
    ],
  };
};
