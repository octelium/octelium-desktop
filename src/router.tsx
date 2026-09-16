import { createHashRouter } from "react-router-dom";

import routerRoot from "@/pages/router";

const router = () => {
  return createHashRouter([routerRoot()]);
};

export default router;
