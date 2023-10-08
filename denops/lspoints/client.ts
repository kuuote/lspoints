import { Denops } from "./deps/denops.ts";
import { LSP } from "./deps/lsp.ts";
import { Settings } from "./interface.ts";
import { JsonRpcClient, Tracer } from "./jsonrpc/jsonrpc_client.ts";

export type ClientOptions = {
  rootPath?: string;
  rootUri?: string;
  initializationOptions?: Record<string, unknown>;
};

async function prettyTracer(clientName: string, dir: string): Promise<Tracer> {
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
    r: async (msg) => {
      await write("r", msg);
    },
    w: async (msg) => {
      await write("w", msg);
    },
  };
}

let clientID = 0;

export class LanguageClient {
  name: string;
  id = clientID++;
  denops: Denops;
  rpcClient: JsonRpcClient;

  serverCapabilities: LSP.ServerCapabilities = {};

  #attachedBuffers: Record<number, string> = {};

  constructor(denops: Denops, name: string, command: string[]) {
    this.denops = denops;
    this.name = name;
    this.rpcClient = new JsonRpcClient(command);
  }

  async initialize(options: ClientOptions = {}, settings: Settings) {
    if (settings.tracePath != null) {
      this.rpcClient.tracers.push(
        await prettyTracer(this.name, settings.tracePath),
      );
    }
    let rootUri: string | null = null;
    if (options.rootUri != null) {
      rootUri = String(options.rootUri);
    } else if (options.rootPath != null) {
      rootUri = "file://" + String(options.rootPath);
    }
    const response = await this.rpcClient.request(
      "initialize",
      {
        clientInfo: {
          name: "lspoints",
          version: "alpha2",
        },
        processId: Deno.pid,
        capabilities: settings.clientCapabilites,
        initializationOptions: options.initializationOptions ?? {},
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

  getUriFromBufNr(bufNr: number) {
    return this.#attachedBuffers[bufNr] ?? "";
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
