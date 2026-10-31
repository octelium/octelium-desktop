/* eslint-disable react-refresh/only-export-components */

import { Navigate, type RouteObject } from "react-router-dom";
import Connection from "./Connection";
import Diagnostics from "./Diagnostics";
import Root from "./index";
import routerNamespaces from "./Namespaces/router";
import routerServices from "./Services/router";
import Settings from "./Settings";

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
        element: <Connection />,
      },
      routerServices(),
      routerNamespaces(),
      {
        path: "clusters",
        element: <Navigate to="/settings?section=clusters" replace />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
      {
        path: "diagnostics",
        element: <Diagnostics />,
      },
      {
        path: "*",
        element: <Navigate to="/connection" replace />,
      },
    ],
  };
};
