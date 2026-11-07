import ActionButton from "@/components/ActionButton";
import { SectionCard } from "@/components/Card";
import LogoMain from "@/components/LogoMain";
import Notice from "@/components/Notice";
import {
  authenticateBrowser,
  authenticateToken,
  getErrorMessage,
} from "@/features/daemon/actions";
import {
  useDomainState,
  useSelectDomain,
} from "@/features/daemon/hooks";
import { Operation_State } from "@/gen/client/daemonv1";
import {
  isConnectionBusy,
  isOperationActive,
  normalizeDomain,
  validateDomain,
} from "@/utils/daemon";
import { openExternal } from "@/utils/native";
import { Collapse, PasswordInput, TextInput } from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  ChevronDown,
  Globe,
  KeyRound,
  LogIn,
  Plus,
} from "lucide-react";
import { useState } from "react";
import { twMerge } from "@/utils/tailwind";

type Props = {
  domain?: string;
  title?: string;
  description?: string;
  compact?: boolean;
  onSuccess?: (domain: string) => void;
};

const ClusterSignIn = (props: Props) => {
  const selectDomain = useSelectDomain();
  const state = useDomainState(props.domain);
  const busy = isConnectionBusy(state) || isOperationActive(state?.lastOperation);
  const [domainInput, setDomainInput] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [token, setToken] = useState("");

  const mutation = useMutation({
    mutationFn: async (method: "browser" | "token") => {
      const domain = normalizeDomain(props.domain ?? domainInput);
      const invalid = validateDomain(domain);
      if (invalid) {
        throw new Error(invalid);
      }
      if (method === "token" && token.trim() === "") {
        throw new Error("The authentication Token is required");
      }

      const operation =
        method === "browser"
          ? await authenticateBrowser(domain)
          : await authenticateToken(domain, token.trim());
      const canonicalDomain = operation.domain || domain;
      selectDomain(canonicalDomain);

      if (
        operation.state === Operation_State.WAITING_FOR_USER &&
        operation.action?.type.oneofKind === "openURL"
      ) {
        await openExternal(operation.action.type.openURL.url);
      }

      return canonicalDomain;
    },
    onSuccess: (domain) => {
      setDomainInput("");
      setToken("");
      props.onSuccess?.(domain);
    },
  });

  const form = (
    <>
      {!props.domain && (
        <TextInput
          label="Cluster domain"
          placeholder="example.com"
          spellCheck={false}
          autoComplete="url"
          autoCapitalize="off"
          data-autofocus
          autoFocus={!props.compact}
          leftSection={<Globe size={15} aria-hidden />}
          leftSectionPointerEvents="none"
          value={domainInput}
          onChange={(event) => setDomainInput(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              mutation.mutate("browser");
            }
          }}
        />
      )}

      {mutation.isError && (
        <Notice
          tone="rose"
          className={props.domain ? "mb-3" : "mt-3 mb-3"}
          icon={<AlertCircle size={15} aria-hidden />}
          title="Could not start sign in"
        >
          {getErrorMessage(mutation.error)}
        </Notice>
      )}

      <div className={props.domain || mutation.isError ? "" : "mt-3"}>
        <ActionButton
          label="Continue in browser"
          Icon={LogIn}
          pending={mutation.isPending && mutation.variables === "browser"}
          disabled={mutation.isPending || busy}
          onClick={() => mutation.mutate("browser")}
        />
      </div>

      <button
        type="button"
        className="mx-auto mt-3 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors hover:text-strong"
        aria-expanded={advanced}
        onClick={() => setAdvanced((value) => !value)}
      >
        <KeyRound size={13} aria-hidden />
        Use an authentication Token
        <ChevronDown
          size={13}
          aria-hidden
          className={twMerge(
            "transition-transform duration-200",
            advanced && "rotate-180",
          )}
        />
      </button>

      <Collapse expanded={advanced} transitionDuration={200}>
        <div className="mt-3 flex flex-col gap-3">
          <PasswordInput
            label="Authentication Token"
            placeholder="Paste the Token"
            spellCheck={false}
            autoComplete="off"
            value={token}
            onChange={(event) => setToken(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                mutation.mutate("token");
              }
            }}
          />
          <ActionButton
            label="Sign in with the Token"
            Icon={KeyRound}
            quiet
            pending={mutation.isPending && mutation.variables === "token"}
            disabled={mutation.isPending || busy}
            onClick={() => mutation.mutate("token")}
          />
        </div>
      </Collapse>
    </>
  );

  if (props.compact) {
    return (
      <SectionCard
        title={props.title ?? "Add a Cluster"}
        description={props.description}
        icon={<Plus size={14} strokeWidth={2.25} />}
      >
        {form}
      </SectionCard>
    );
  }

  return (
    <section className="m-auto flex w-full max-w-[22rem] flex-col py-4">
      <header className="mb-6 flex flex-col items-center text-center">
        <LogoMain />
        <h1 className="text-2xl font-bold tracking-[-0.01em] text-balance text-strong">
          {props.title ??
            (props.domain ? `Sign in to ${props.domain}` : "Sign in to Octelium")}
        </h1>
        {(props.description || !props.domain) && (
          <p className="mt-2 text-ui leading-6 font-normal text-muted">
            {props.description ?? "Enter your Cluster domain to continue."}
          </p>
        )}
      </header>

      {form}

      <p className="mt-4 text-center text-xs leading-5 font-normal text-muted">
        Signing in opens the Cluster Portal in your default browser.
      </p>
    </section>
  );
};

export default ClusterSignIn;
