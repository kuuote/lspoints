import type { Denops } from "./deps/denops.ts";
import type { LSP } from "./deps/lsp.ts";
import type { Settings, StartOptions } from "./interface.ts";
import { JsonRpcClient, type LogHandler } from "./jsonrpc/jsonrpc_client.ts";
import { version } from "./version.ts";

export type ClientOptions = {
  rootPath?: string;
  rootUri?: string;
  initializationOptions?: Record<string, unknown>;
};

async function createPrettyTracer(
  clientName: string,
  dir: string,
): Promise<LogHandler> {
  await Deno.mkdir(dir).catch(() => {});
  const path = dir.replace(/\/?$/, "/") + `${clientName}_${Date.now()}.log`;
  async function write(type: string, msg: unknown) {
    const text = [
      `☆ ${type}`,
      JSON.stringify(msg, null, "\t"),
      "", // last newline
    ].join("\n");
    await Deno.writeTextFile(path, text, {
      append: true,
    });
  }
  return {
    onRead: async (msg) => {
      await write("r", msg);
    },
    onWrite: async (msg) => {
      await write("w", msg);
    },
    onStderr: async (msg) => {
      await write("e", msg);
    },
  };
}

let clientID = 0;

export class LanguageClient {
  denops: Denops;
  name: string;
  options: StartOptions;

  id = clientID++;
  rpcClient: JsonRpcClient;
  #attachedBuffers: Record<number, string> = {};
  #documentVersions: Record<string, number> = {};

  serverCapabilities: LSP.ServerCapabilities = {};

  constructor(denops: Denops, name: string, startOptions: StartOptions) {
    this.denops = denops;
    this.name = name;
    this.options = startOptions;

    if (startOptions.cmd == null) {
      throw "cmd not specify";
    }
    this.rpcClient = new JsonRpcClient(
      startOptions.cmd,
      startOptions.cmdOptions,
    );
  }

  kill() {
    this.rpcClient.kill();
  }

  async initialize(settings: Settings) {
    if (settings.tracePath != null) {
      this.rpcClient.logger.subscribe(
        await createPrettyTracer(this.name, settings.tracePath),
      );
    }
    let rootUri: string | null = null;
    if (this.options.rootUri != null) {
      rootUri = String(this.options.rootUri);
    } else if (this.options.rootPath != null) {
      rootUri = "file://" + String(this.options.rootPath);
    }
    const response = await this.rpcClient.request(
      "initialize",
      {
        clientInfo: {
          name: "lspoints",
          version,
        },
        processId: Deno.pid,
        capabilities: settings.clientCapabilities,
        initializationOptions: this.options.initializationOptions ?? {},
        rootUri,
      } satisfies LSP.InitializeParams,
    ) as LSP.InitializeResult;
    await this.rpcClient.notify("initialized", {});
    this.serverCapabilities = response.capabilities;
    return this;
  }

  async attach(bufNr: number) {
    const params = await this.denops.call(
      "lspoints#internal#notify_change_params",
      bufNr,
    ) as [number, string, string, number] | 0;
    if (params !== 0) {
      await this.notifyChange(...params);
    }
  }

  getAttachedBufNrs(): number[] {
    return Object.keys(this.#attachedBuffers).map(Number);
  }

  getUriFromBufNr(bufNr: number) {
    return this.#attachedBuffers[bufNr] ?? "";
  }

  getDocumentVersion(bufNr: number) {
    return this.#documentVersions[this.#attachedBuffers[bufNr] ?? ""] ?? -1;
  }

  isAttached(bufNr: number): boolean {
    return this.#attachedBuffers[bufNr] != null;
  }

  async notifyChange(
    bufNr: number,
    uri: string,
    text: string,
    version: number,
  ) {
    const storedUri = this.#attachedBuffers[bufNr];
    // :saveasしたとかattachしてないとかでuri違ったらLS側に開き直すようにお願いする
    if (uri !== storedUri) {
      if (storedUri != null) {
        await this.rpcClient.notify("textDocument/didClose", {
          textDocument: {
            uri,
          },
        });
      }
      const filetype = String(
        await this.denops.call("getbufvar", bufNr, "&filetype"),
      );
      await this.rpcClient.notify("textDocument/didOpen", {
        textDocument: {
          uri,
          languageId: filetype,
          version,
          text,
        },
      });
      this.#attachedBuffers[bufNr] = uri;
      return;
    }
    this.#documentVersions[uri] = version;
    await this.rpcClient.notify("textDocument/didChange", {
      textDocument: {
        uri,
        version,
      },
      contentChanges: [{
        text,
      }],
    });
  }
}
