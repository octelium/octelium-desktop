import {
  authenticateBrowser,
  authenticateToken,
  getErrorMessage,
} from "@/features/daemon/actions";
import { useSelectDomain } from "@/features/daemon/hooks";
import { useDomainState } from "@/features/daemon/hooks";
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
import { ChevronDown, KeyRound, LogIn, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

type Props = {
  domain?: string;
  title?: string;
  description?: string;
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
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <div className="bg-gradient-to-br from-sky-500/10 via-transparent to-indigo-500/10 p-6 sm:p-8">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-lg shadow-sky-500/20">
          <ShieldCheck size={24} aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-strong">
          {props.title ?? (props.domain ? `Sign in to ${props.domain}` : "Set up Octelium")}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
          {props.description ??
            (props.domain
              ? "Your saved domain is ready. Continue in your browser to renew the Session."
              : "Enter your Cluster domain once. Octelium remembers it and takes you straight to your Connection next time.")}
        </p>

        <div className="mt-6 max-w-xl space-y-4">
          {!props.domain && (
            <TextInput
              label="Cluster domain"
              placeholder="example.com"
              size="md"
              spellCheck={false}
              autoComplete="url"
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
            <Alert color="red" radius="md" title="Could not start sign in">
              {getErrorMessage(mutation.error)}
            </Alert>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="md"
              loading={mutation.isPending && mutation.variables === "browser"}
              disabled={mutation.isPending || busy}
              leftSection={<LogIn size={17} aria-hidden />}
              onClick={() => mutation.mutate("browser")}
            >
              Continue in browser
            </Button>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold text-muted transition-colors hover:text-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
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
          </div>

          <Collapse expanded={advanced}>
            <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface/80 p-4 sm:flex-row sm:items-end">
              <PasswordInput
                className="min-w-0 flex-1"
                label="Authentication Token"
                placeholder="Paste the Token"
                spellCheck={false}
                autoComplete="off"
                value={token}
                onChange={(event) => setToken(event.currentTarget.value)}
              />
              <Button
                variant="light"
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
      </div>
    </div>
  );
};

export default ClusterSignIn;
