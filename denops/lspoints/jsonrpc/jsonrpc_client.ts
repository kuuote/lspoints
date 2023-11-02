import { TextLineStream } from "../deps/std.ts";
import { JsonRpcStream } from "./jsonrpc_stream.ts";
import {
  isNotifyMessage,
  isRequestMessage,
  isResponseMessage,
  NotifyMessage,
  RequestMessage,
} from "./message.ts";
import { concat } from "https://deno.land/std@0.204.0/bytes/concat.ts";

type Promisify<T> = T | Promise<T>;

const encoder = new TextEncoder();

function jsonRpcEncode(data: unknown): Uint8Array {
  const buf = encoder.encode(JSON.stringify(data));
  const header = `Content-Length: ${buf.byteLength}\r\n\r\n`;
  const headerRaw = encoder.encode(header);
  return concat(headerRaw, buf);
}

class Logger {
  handlers = new Array<LogHandler>();

  onRead(msg: unknown) {
    for (const handler of this.handlers) {
      handler.onRead?.(msg);
    }
  }
  onWrite(msg: unknown) {
    for (const handler of this.handlers) {
      handler.onWrite?.(msg);
    }
  }
  onStderr(msg: string) {
    for (const handler of this.handlers) {
      handler.onStderr?.(msg);
    }
  }
  subscribe(handler: LogHandler) {
    this.handlers.push(handler);
  }
}

export interface LogHandler {
  onRead?: (msg: unknown) => Promisify<void>;
  onWrite?: (msg: unknown) => Promisify<void>;
  onStderr?: (msg: string) => Promisify<void>;
}

export class JsonRpcClient {
  #process: Deno.ChildProcess;
  #w: WritableStreamDefaultWriter<Uint8Array>;

  #requestId = 0;
  #requestPool: Record<number, [(r: unknown) => void, (e: unknown) => void]> =
    {};

  notifyHandlers: Array<(msg: NotifyMessage) => Promisify<void>> = [];
  requestHandlers: Array<
    (msg: RequestMessage) => Promisify<unknown | undefined>
  > = [];
  logger = new Logger();

  constructor(command: string[]) {
    this.#process = new Deno.Command(command[0], {
      args: command.slice(1),
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    this.#process.stdout
      .pipeThrough(new JsonRpcStream())
      .pipeTo(
        new WritableStream({
          write: (chunk: unknown) => {
            this.logger.onRead(chunk);
            if (isRequestMessage(chunk)) {
              (async () => {
                for (const handler of this.requestHandlers) {
                  const result = await handler(chunk);
                  if (result !== undefined) {
                    this.#sendMessage({
                      jsonrpc: "2.0",
                      id: chunk.id,
                      result,
                    });
                    return;
                  }
                }
              })().catch(console.trace);
            } else if (isResponseMessage(chunk)) {
              const id = Number(chunk.id);
              const cb = this.#requestPool[id];
              if (cb == null) {
                // console.log("unresolved response: " + id);
                // console.log(chunk);
              } else {
                if (chunk.result !== undefined) { // contains null
                  cb[0](chunk.result);
                } else if (chunk.error != null) {
                  cb[1](JSON.stringify(chunk.error));
                }
                delete this.#requestPool[id];
              }
            } else if (isNotifyMessage(chunk)) {
              for (const notifier of this.notifyHandlers) {
                notifier(chunk)?.catch(console.log);
              }
            } else {
              console.log("unresolved chunk");
              console.log(chunk);
            }
          },
        }),
      );
    this.#process.stderr
      .pipeThrough(new TextDecoderStream())
      .pipeThrough(new TextLineStream())
      .pipeTo(
        new WritableStream({
          write: (line: string) => {
            this.logger.onStderr(line);
          },
        }),
      );
    this.#w = this.#process.stdin.getWriter();
  }

  async #sendMessage(msg: unknown) {
    this.logger.onWrite(msg);
    await this.#w.write(jsonRpcEncode(msg));
  }

  async notify(
    method: string,
    params?: unknown[] | Record<string, unknown>,
  ): Promise<void> {
    const msg: NotifyMessage = {
      jsonrpc: "2.0",
      method,
    };
    if (params != null) {
      msg.params = params;
    }
    await this.#sendMessage(msg);
  }

  async request(
    method: string,
    params?: unknown[] | Record<string, unknown>,
  ): Promise<unknown> {
    const id = this.#requestId++;
    const msg: RequestMessage = {
      jsonrpc: "2.0",
      id,
      method,
    };
    if (params != null) {
      msg.params = params;
    }
    await this.#sendMessage(msg);
    return new Promise((resolve, reject) => {
      this.#requestPool[id] = [resolve, reject];
    });
  }
}
