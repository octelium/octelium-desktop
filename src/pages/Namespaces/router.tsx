/* eslint-disable react-refresh/only-export-components */

import type { RouteObject } from "react-router-dom";
import Root from "./index";
import List from "./List";

export default (): RouteObject => {
  return {
    path: "namespaces",
    element: <Root />,
    children: [
      {
        path: "",
        element: <List />,
      },
    ],
  };
};
