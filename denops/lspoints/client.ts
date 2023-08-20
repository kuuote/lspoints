import { autocmd, Denops } from "./deps/denops.ts";
import { LSP } from "./deps/lsp.ts";
import { Settings } from "./interface.ts";
import { JsonRpcClient, Tracer } from "./jsonrpc/jsonrpc_client.ts";

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

export class LanguageClient {
  name: string;
  denops: Denops;
  rpcClient: JsonRpcClient;

  serverCapabilities: LSP.ServerCapabilities = {};

  #attachedBuffers: Record<number, string> = {};

  constructor(denops: Denops, name: string, command: string[]) {
    this.denops = denops;
    this.name = name;
    this.rpcClient = new JsonRpcClient(command);
  }

  async initialize(options: Record<string, unknown> = {}, settings: Settings) {
    if (settings.tracePath != null) {
      this.rpcClient.tracers.push(
        await prettyTracer(this.name, settings.tracePath),
      );
    }
    const response = await this.rpcClient.request(
      "initialize",
      {
        processId: Deno.pid,
        // TODO: 後で渡してやれるようにする
        capabilities: options.capabilities ?? {
          "general": {
            "positionEncodings": [
              "utf-16",
            ],
          },
          "textDocument": {},
        },
        initializationOptions: options.initializationOptions,
        rootUri: null,
      } satisfies LSP.InitializeParams,
    ) as LSP.InitializeResult;
    await this.rpcClient.notify("initialized", {});
    this.serverCapabilities = response.capabilities;
    return this;
  }

  async attach(bufNr: number) {
    if (this.isAttached(bufNr)) {
      return;
    }
    const uri = String(
      await this.denops.call("lspoints#util#bufnr_to_uri", bufNr),
    );
    this.#attachedBuffers[bufNr] = uri;
    const filetype = String(
      await this.denops.call("getbufvar", bufNr, "&filetype"),
    );

    const text = await this.denops.call(
      "lspoints#util#get_text",
      bufNr,
    ) as string;

    await this.rpcClient.notify("textDocument/didOpen", {
      textDocument: {
        uri,
        languageId: filetype,
        version: 0,
        text,
      },
    });
    await autocmd.group(
      this.denops,
      "lspoints.internal",
      (helper) => {
        helper.remove("*", "<buffer>");
        helper.define(
          ["TextChanged", "TextChangedI"],
          "<buffer>",
          `call lspoints#internal#notifychange(${bufNr})`,
        );
      },
    );
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
    const oldUri = this.#attachedBuffers[bufNr];
    if (oldUri == null) {
      throw Error(`not attached ${this.name} to ${bufNr}`);
    }
    // TODO: uri違ったらattachし直す
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
