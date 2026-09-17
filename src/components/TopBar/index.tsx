/// <reference types="vite-plugin-svgr/client" />

import Wordmark from "@/assets/wordmark.svg?react";
import ThemeToggle from "@/components/ThemeToggle";

const TopBar = () => {
  return (
    <nav className="flex h-[60px] w-full items-center px-4">
      <div className="flex flex-none items-center justify-center text-strong">
        <Wordmark className="h-auto w-36" aria-label="Octelium" />
      </div>

      <div className="flex-grow" />

      <div className="flex flex-none items-center">
        <ThemeToggle />
      </div>
    </nav>
  );
};

export default TopBar;
