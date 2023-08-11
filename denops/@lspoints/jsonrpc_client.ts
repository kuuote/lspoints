import { JsonRpcStream } from "./jsonrpc_stream.ts";
import {
  isNotifyMessage,
  isRequestMessage,
  isResponseMessage,
  NotifyMessage,
  RequestMessage,
} from "./types/message.ts";
import { concat } from "https://deno.land/std@0.196.0/bytes/concat.ts";

const encoder = new TextEncoder();

function jsonRpcEncode(data: unknown): Uint8Array {
  const buf = encoder.encode(JSON.stringify(data));
  const header = `Content-Length: ${buf.byteLength}\r\n\r\n`;
  const headerRaw = encoder.encode(header);
  return concat(headerRaw, buf);
}

export class JsonRpcClient {
  #process: Deno.ChildProcess;
  #w: WritableStreamDefaultWriter<Uint8Array>;

  #requestId = 0;
  #requestPool: Record<number, [(r: unknown) => void, (e: unknown) => void]> =
    {};
  #notifyHandlers: Array<(msg: NotifyMessage) => unknown> = [];

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
            if (isRequestMessage(chunk)) {
              console.log("request");
              console.log(chunk);
            } else if (isResponseMessage(chunk)) {
              const id = Number(chunk.id);
              const cb = this.#requestPool[id];
              if (cb == null) {
                console.log("unresolved response: " + id);
                console.log(chunk);
              } else {
                if (chunk.result !== undefined) { // contains null
                  cb[0](chunk.result);
                } else if (chunk.error != null) {
                  cb[1](chunk.error);
                }
                delete this.#requestPool[id];
              }
            } else if (isNotifyMessage(chunk)) {
              for (const handler of this.#notifyHandlers) {
                handler(chunk);
              }
            } else {
              console.log("unresolved chunk");
              console.log(chunk);
            }
          },
        }),
      );
    this.#w = this.#process.stdin.getWriter();
  }

  async #sendMessage(msg: unknown) {
    await this.#w.write(jsonRpcEncode(msg));
  }

  async notify(method: string, params?: unknown[] | Record<string, unknown>) {
    const msg: NotifyMessage = {
      jsonrpc: "2.0",
      method,
    };
    if (params != null) {
      msg.params = params;
    }
    await this.#sendMessage(msg);
  }

  async request(method: string, params?: unknown[] | Record<string, unknown>) {
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

  subscribeNotify(handler: (msg: NotifyMessage) => unknown) {
    this.#notifyHandlers.push(handler);
  }
}
