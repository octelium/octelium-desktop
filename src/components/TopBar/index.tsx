/// <reference types="vite-plugin-svgr/client" />

import Wordmark from "@/assets/wordmark.svg?react";
import AccountMenu from "@/components/AccountMenu";
import AppearanceControl from "@/components/AppearanceControl";

const TopBar = (props: { onSignOut: (domain: string) => void }) => {
  return (
    <header
      data-tauri-drag-region="deep"
      className="relative z-20 flex h-[60px] w-full flex-none items-center gap-3 border-b border-line bg-app px-4 traffic-lights:pl-[88px]"
    >
      <div className="flex flex-none items-center text-strong">
        <Wordmark className="h-auto w-[152px]" aria-label="Octelium" />
      </div>

      <div className="flex-1" />

      <div className="flex flex-none items-center gap-2">
        <AppearanceControl />
        <AccountMenu onSignOut={props.onSignOut} />
      </div>
    </header>
  );
};

export default TopBar;
