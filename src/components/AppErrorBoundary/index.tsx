import { Button } from "@mantine/core";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

type State = { error?: Error };

class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-app p-6">
        <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-8 shadow-lg">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <AlertTriangle size={24} aria-hidden />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-strong">
            Octelium could not display this screen
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Reload the application. Your Connection is managed by the daemon and
            remains active while the interface restarts.
          </p>
          <pre
            className="mt-5 max-h-32 overflow-auto rounded-lg bg-surface-2 p-3 text-xs text-body"
            data-selectable
          >
            {this.state.error.message}
          </pre>
          <Button
            className="mt-5"
            leftSection={<RefreshCw size={16} aria-hidden />}
            onClick={() => window.location.reload()}
          >
            Reload Octelium
          </Button>
        </div>
      </main>
    );
  }
}

export default AppErrorBoundary;
