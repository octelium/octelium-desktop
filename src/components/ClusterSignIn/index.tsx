import Mark from "@/assets/mark.svg?react";
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
  normalizeDomain,
  validateDomain,
} from "@/utils/daemon";
import { openExternal } from "@/utils/native";
import {
  Alert,
  Button,
  Collapse,
  PasswordInput,
  TextInput,
} from "@mantine/core";
import { useMutation } from "@tanstack/react-query";
import { ChevronDown, KeyRound, LogIn } from "lucide-react";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

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
  const busy = isConnectionBusy(state);
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

  return (
    <section
      className={twMerge(
        "mx-auto flex w-full flex-col",
        props.compact
          ? "items-stretch text-left"
          : "max-w-lg items-center px-2 py-6 text-center sm:py-10",
      )}
    >
      {!props.compact && (
        <div className="flex h-32 w-32 items-center justify-center rounded-full bg-black text-white shadow-2xl shadow-black/20 ring-1 ring-white/10 sm:h-40 sm:w-40">
          <Mark className="h-20 w-20 sm:h-24 sm:w-24" aria-label="Octelium" />
        </div>
      )}

      <h1
        className={twMerge(
          "font-extrabold tracking-tight text-strong",
          props.compact ? "text-lg" : "mt-7 text-2xl",
        )}
      >
        {props.title ??
          (props.domain ? `Sign in to ${props.domain}` : "Welcome to Octelium")}
      </h1>
      <p className="mt-2 max-w-md text-sm font-medium leading-6 text-muted">
        {props.description ??
          (props.domain
            ? "Continue in your browser to renew this Cluster Session."
            : "Enter your Cluster domain to securely sign in and connect this device.")}
      </p>

      <div
        className={twMerge(
          "w-full rounded-2xl border border-line bg-surface p-5 text-left shadow-lg shadow-slate-900/5 dark:shadow-black/20",
          props.compact ? "mt-4" : "mt-7 sm:p-6",
        )}
      >
        {!props.domain && (
          <TextInput
            label="Cluster domain"
            placeholder="example.com"
            size="md"
            spellCheck={false}
            autoComplete="url"
            autoFocus
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
          <Alert
            color="red"
            radius="md"
            className={props.domain ? "" : "mt-4"}
            title="Could not start sign in"
          >
            {getErrorMessage(mutation.error)}
          </Alert>
        )}

        <Button
          fullWidth
          size="lg"
          className={
            props.domain && !mutation.isError
              ? "mt-0"
              : mutation.isError
                ? "mt-4"
                : "mt-5"
          }
          loading={mutation.isPending && mutation.variables === "browser"}
          disabled={mutation.isPending || busy}
          leftSection={<LogIn size={18} aria-hidden />}
          onClick={() => mutation.mutate("browser")}
        >
          Continue in browser
        </Button>

        <button
          type="button"
          className="mx-auto mt-4 flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold text-muted transition-colors hover:text-strong"
          aria-expanded={advanced}
          onClick={() => setAdvanced((value) => !value)}
        >
          Use an authentication Token
          <ChevronDown
            size={15}
            aria-hidden
            className={twMerge(
              "transition-transform duration-200",
              advanced && "rotate-180",
            )}
          />
        </button>

        <Collapse expanded={advanced}>
          <div className="mt-4 border-t border-line pt-4">
            <PasswordInput
              label="Authentication Token"
              placeholder="Paste the Token"
              spellCheck={false}
              autoComplete="off"
              value={token}
              onChange={(event) => setToken(event.currentTarget.value)}
            />
            <Button
              fullWidth
              className="mt-3"
              variant="outline"
              loading={mutation.isPending && mutation.variables === "token"}
              disabled={mutation.isPending || busy}
              leftSection={<KeyRound size={16} aria-hidden />}
              onClick={() => mutation.mutate("token")}
            >
              Use Token
            </Button>
          </div>
        </Collapse>
      </div>
    </section>
  );
};

export default ClusterSignIn;
