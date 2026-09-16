import ExternalLink from "@/components/ExternalLink";
import { BsGithub } from "react-icons/bs";

const Footer = () => {
  return (
    <div className="mt-6 mb-6 w-full bg-inherit pt-8">
      <div className="flex w-full flex-col items-center px-6">
        <div className="flex flex-wrap items-center justify-center">
          <span className="text-sm font-bold text-body">
            Octelium is Free and Open Source Software
          </span>
        </div>
        <ExternalLink
          className="mt-3 flex items-center gap-2 text-sm font-bold text-muted transition-colors duration-500 hover:text-strong"
          href="https://github.com/octelium/octelium"
        >
          <BsGithub aria-hidden />
          <span>github.com/octelium/octelium</span>
        </ExternalLink>
      </div>
    </div>
  );
};

export default Footer;
