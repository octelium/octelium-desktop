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
      <main className="flex h-full items-center justify-center bg-app p-6">
        <div className="w-full max-w-lg rounded-xl border border-line bg-surface p-6 shadow-raised">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            <AlertTriangle size={18} aria-hidden />
          </div>
          <h1 className="text-base font-bold tracking-tight text-strong">
            Octelium could not display this screen
          </h1>
          <p className="mt-1 text-ui text-muted">
            Reload the application. Your Connection is managed by the daemon and
            remains active while the interface restarts.
          </p>
          <pre
            className="mt-4 max-h-32 overflow-auto rounded-lg border border-line bg-surface-2 p-3 font-mono text-xs whitespace-pre-wrap text-body"
            data-selectable
          >
            {this.state.error.message}
          </pre>
          <Button
            className="mt-4"
            leftSection={<RefreshCw size={14} aria-hidden />}
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
