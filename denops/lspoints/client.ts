import { autocmd, Denops } from "./deps/denops.ts";
import { LSP } from "./deps/lsp.ts";
import { JsonRpcClient, Tracer } from "./jsonrpc/jsonrpc_client.ts";

async function prettyTracer(clientName: string): Promise<Tracer> {
  await Deno.mkdir("/tmp/lspoints").catch(() => {});
  const path = "/tmp/lspoints/" + Date.now() + ".log";
  async function write(type: string, msg: unknown) {
    const text = [
      `☆ ${type} ${clientName}`,
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

  async initialize(options: Record<string, unknown> = {}) {
    this.rpcClient.subscribeTracer(await prettyTracer(this.name));
    const response = await this.rpcClient.request(
      "initialize",
      {
        processId: Deno.pid,
        // TODO: 後で渡してやれるようにする
        capabilities: {},
        initializationOptions: options.initializationOptions,
        rootUri: null,
      } satisfies LSP.InitializeParams,
    ) as LSP.InitializeResult;
    this.serverCapabilities = response.capabilities;
    return this;
  }

  async attach(bufNr: number) {
    if (this.isAttached(bufNr)) {
      return;
    }
    const bufname = String(
      await this.denops.eval("fnamemodify(bufname(bufNr), ':p')", {
        bufNr,
      }),
    );
    const uri = "file://" + bufname;
    const filetype = String(
      await this.denops.call("getbufvar", bufNr, "&filetype"),
    );
    this.#attachedBuffers[bufNr] = uri;

    const text =
      (await this.denops.call("getbufline", bufNr, 1, "$") as string[]).join(
        "\n",
      ) + "\n";

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
          `call denops#notify('lspoints', 'notifyChange', [${bufNr}, getbufvar(${bufNr}, 'changedtick')])`,
        );
      },
    );
  }

  isAttached(bufNr: number): boolean {
    return this.#attachedBuffers[bufNr] != null;
  }

  async notifyChange(bufNr: number, text: string, version: number) {
    const uri = this.#attachedBuffers[bufNr];
    if (uri == null) {
      throw Error(`not attached ${this.name} to ${bufNr}`);
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
