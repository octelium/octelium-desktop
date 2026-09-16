import { Channel, invoke } from "@tauri-apps/api/core";
import type {
  ClientStreamingCall,
  DuplexStreamingCall,
  MethodInfo,
  RpcMetadata,
  RpcOptions,
  RpcStatus,
  RpcTransport,
} from "@protobuf-ts/runtime-rpc";
import {
  mergeRpcOptions,
  RpcError,
  RpcOutputStreamController,
  ServerStreamingCall,
  UnaryCall,
} from "@protobuf-ts/runtime-rpc";

import { decodeBase64, encodeBase64 } from "./base64";
import { getGrpcCode } from "./codes";

export type Target = "daemon" | "cluster";

type StreamEvent =
  | { kind: "message"; data: string }
  | { kind: "end"; code: number; message: string };

type CallError = {
  code?: number;
  message?: string;
};

export type TauriTransportOptions = {
  target: Target;
  getDomain?: () => string | undefined;
};

const OK_STATUS: RpcStatus = { code: "OK", detail: "" };

const getMethodPath = (method: MethodInfo): string =>
  `/${method.service.typeName}/${method.name}`;

const getSilent = <T>(arg: Promise<T>): Promise<T> => {
  arg.catch(() => {});
  return arg;
};

const withAbort = <T>(arg: Promise<T>, signal?: AbortSignal): Promise<T> => {
  if (!signal) {
    return arg;
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () =>
      reject(new RpcError("The call was canceled", "CANCELLED"));

    if (signal.aborted) {
      onAbort();
      return;
    }

    signal.addEventListener("abort", onAbort, { once: true });

    arg.then(resolve, reject).finally(() =>
      signal.removeEventListener("abort", onAbort),
    );
  });
};

export const getRpcError = (arg: unknown): RpcError => {
  if (arg instanceof RpcError) {
    return arg;
  }

  if (typeof arg === "object" && arg !== null && "code" in arg) {
    const err = arg as CallError;
    return new RpcError(err.message ?? "", getGrpcCode(err.code));
  }

  return new RpcError(arg instanceof Error ? arg.message : String(arg), "UNKNOWN");
};

export class TauriTransport implements RpcTransport {
  constructor(private readonly opts: TauriTransportOptions) {}

  mergeOptions(options?: Partial<RpcOptions>): RpcOptions {
    return mergeRpcOptions({}, options);
  }

  unary<I extends object, O extends object>(
    method: MethodInfo<I, O>,
    input: I,
    options: RpcOptions,
  ): UnaryCall<I, O> {
    const response = (async () => {
      const ret = await withAbort(
        invoke<string>("grpc_unary", {
          target: this.opts.target,
          domain: this.opts.getDomain?.(),
          method: getMethodPath(method),
          request: encodeBase64(method.I.toBinary(input)),
        }),
        options.abort,
      ).catch((err) => {
        throw getRpcError(err);
      });

      return method.O.fromBinary(decodeBase64(ret));
    })();

    return new UnaryCall<I, O>(
      method,
      options.meta ?? {},
      input,
      Promise.resolve<RpcMetadata>({}),
      response,
      getSilent(response.then(() => OK_STATUS)),
      getSilent(response.then((): RpcMetadata => ({}))),
    );
  }

  serverStreaming<I extends object, O extends object>(
    method: MethodInfo<I, O>,
    input: I,
    options: RpcOptions,
  ): ServerStreamingCall<I, O> {
    const stream = new RpcOutputStreamController<O>();

    let status: (value: RpcStatus) => void = () => {};
    let statusErr: (reason: unknown) => void = () => {};
    const statusPromise = new Promise<RpcStatus>((resolve, reject) => {
      status = resolve;
      statusErr = reject;
    });

    getSilent(statusPromise);

    const onEvent = new Channel<StreamEvent>();
    const signal = options.abort;
    let settled = false;

    const cleanup = () => signal?.removeEventListener("abort", abort);
    const settleError = (error: RpcError) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      if (!stream.closed) {
        stream.notifyError(error);
      }
      statusErr(error);
    };

    onEvent.onmessage = (ev) => {
      if (stream.closed) {
        return;
      }

      if (ev.kind === "message") {
        stream.notifyMessage(method.O.fromBinary(decodeBase64(ev.data)));
        return;
      }

      if (ev.code === 0) {
        settled = true;
        cleanup();
        stream.notifyComplete();
        status(OK_STATUS);
        return;
      }

      const err = new RpcError(ev.message, getGrpcCode(ev.code));
      settleError(err);
    };

    const started = invoke<number>("grpc_server_streaming", {
      target: this.opts.target,
      domain: this.opts.getDomain?.(),
      method: getMethodPath(method),
      request: encodeBase64(method.I.toBinary(input)),
      onEvent,
    });

    started.catch((err) => {
      const ret = getRpcError(err);
      settleError(ret);
    });

    function abort() {
      settleError(new RpcError("The call was canceled", "CANCELLED"));
      started
        .then((callId) => invoke("grpc_cancel", { callId }))
        .catch(() => {});
    }

    if (signal) {
      if (signal.aborted) {
        abort();
      } else {
        signal.addEventListener("abort", abort, { once: true });
      }
    }

    return new ServerStreamingCall<I, O>(
      method,
      options.meta ?? {},
      input,
      Promise.resolve<RpcMetadata>({}),
      stream,
      statusPromise,
      getSilent(statusPromise.then((): RpcMetadata => ({}))),
    );
  }

  clientStreaming<I extends object, O extends object>(
    method: MethodInfo<I, O>,
  ): ClientStreamingCall<I, O> {
    throw new RpcError(
      `Client streaming is not supported by the local transport: ${getMethodPath(method)}`,
      "UNIMPLEMENTED",
    );
  }

  duplex<I extends object, O extends object>(
    method: MethodInfo<I, O>,
  ): DuplexStreamingCall<I, O> {
    throw new RpcError(
      `Duplex streaming is not supported by the local transport: ${getMethodPath(method)}`,
      "UNIMPLEMENTED",
    );
  }
}

export { decodeBase64, encodeBase64, getGrpcCode, getMethodPath };
