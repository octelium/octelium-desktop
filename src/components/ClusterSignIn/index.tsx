import Mark from "@/assets/mark.svg?react";
import { Card, SectionCard } from "@/components/Card";
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
import { Button, Collapse, PasswordInput, TextInput } from "@mantine/core";
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
          className={props.domain ? "" : "mt-3"}
          icon={<AlertCircle size={15} aria-hidden />}
          title="Could not start sign in"
        >
          {getErrorMessage(mutation.error)}
        </Notice>
      )}

      <Button
        fullWidth
        size="md"
        className={props.domain && !mutation.isError ? "mt-0" : "mt-3"}
        loading={mutation.isPending && mutation.variables === "browser"}
        disabled={mutation.isPending || busy}
        leftSection={<LogIn size={16} aria-hidden />}
        onClick={() => mutation.mutate("browser")}
      >
        Continue in browser
      </Button>

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
        <div className="mt-3 flex flex-col gap-3 border-t border-line-subtle pt-4">
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
          <Button
            fullWidth
            variant="default"
            loading={mutation.isPending && mutation.variables === "token"}
            disabled={mutation.isPending || busy}
            leftSection={<KeyRound size={14} aria-hidden />}
            onClick={() => mutation.mutate("token")}
          >
            Sign in with the Token
          </Button>
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
    <section className="mx-auto flex w-full max-w-[420px] flex-col items-center py-8 text-center sm:py-12">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-brand-fg dark:ring-1 dark:ring-line-strong dark:ring-inset shadow-raised">
        <Mark className="h-9 w-9" aria-label="Octelium" />
      </div>

      <h1 className="mt-6 text-xl font-bold tracking-[-0.015em] text-strong">
        {props.title ??
          (props.domain ? `Sign in to ${props.domain}` : "Welcome to Octelium")}
      </h1>
      <p className="mt-1.5 max-w-sm text-ui text-muted">
        {props.description ??
          (props.domain
            ? "Continue in your browser to renew the Session of this Cluster."
            : "Enter your Cluster domain to securely sign in and connect this device.")}
      </p>

      <Card className="mt-6 w-full p-5 text-left">{form}</Card>

      <p className="mt-4 max-w-sm text-xs text-faint">
        Signing in opens the Cluster Portal in your default browser.
      </p>
    </section>
  );
};

export default ClusterSignIn;
