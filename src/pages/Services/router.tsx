/* eslint-disable react-refresh/only-export-components */

import Loading from "@/components/Loading";
import { lazy, Suspense } from "react";
import type { RouteObject } from "react-router-dom";
import Root from "./index";

const List = lazy(() => import("./List"));

export default (): RouteObject => {
  return {
    path: "services",
    element: <Root />,
    children: [
      {
        path: "",
        element: (
          <Suspense fallback={<Loading />}>
            <List />
          </Suspense>
        ),
      },
    ],
  };
};
