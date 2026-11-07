/// <reference types="vite-plugin-svgr/client" />

import Logo from "@/assets/logo.svg?react";

const LogoMain = () => (
  <Logo
    aria-label="Octelium"
    className="mb-7 size-[clamp(6.5rem,18.5svh,10.5rem)] rounded-full shadow-logo [&>path:first-child]:fill-(--oct-logo-disc)"
  />
);

export default LogoMain;
