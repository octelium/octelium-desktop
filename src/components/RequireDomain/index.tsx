import { EmptyState } from "@/components/AsyncState";
import { useDomainState } from "@/features/daemon/hooks";
import { isAuthenticated } from "@/utils/daemon";
import { useAppSelector } from "@/utils/hooks";
import { Button } from "@mantine/core";
import { LogIn, Shield } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

const RequireDomain = (props: {
  children: (domain: string) => ReactNode;
}) => {
  const navigate = useNavigate();
  const domain = useAppSelector((state) => state.daemon.selectedDomain);
  const state = useDomainState(domain);

  if (!domain) {
    return (
      <EmptyState
        title="Set up your Cluster"
        message="Add your primary domain to browse the Services available to you."
        icon={<Shield size={22} aria-hidden />}
        action={
          <Button onClick={() => navigate("/connection")}>Get started</Button>
        }
      />
    );
  }

  if (!isAuthenticated(state)) {
    return (
      <EmptyState
        title={`Sign in to ${domain}`}
        message="The Cluster resources are read directly from the Cluster API using your Session."
        icon={<LogIn size={22} aria-hidden />}
        action={
          <Button onClick={() => navigate("/connection")}>Sign in again</Button>
        }
      />
    );
  }

  return <>{props.children(domain)}</>;
};

export default RequireDomain;
