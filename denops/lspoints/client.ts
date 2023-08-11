import { autocmd, Denops } from "../@lspoints/deps/denops.ts";
import { LSP } from "../@lspoints/deps/lsp.ts";
import { JsonRpcClient } from "../@lspoints/jsonrpc_client.ts";

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
    const response = await this.rpcClient.request(
      "initialize",
      {
        processId: Deno.pid,
        // TODO: 後で渡してやれるようにする
        capabilities: {
          textDocument: {
            // publishDiagnostics: {
            //   tagSupport: {
            //     valueSet: [1, 2],
            //   },
            //   relatedInformation: true,
            //   dataSupport: true,
            // },
          },
        },
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
      "lspoints.internal.notifyChange",
      (helper) => {
        helper.remove("*", "<buffer>");
        helper.define(
          ["TextChanged", "TextChangedI"],
          "<buffer>",
          `call denops#notify('lspoints', 'notifyChange', [${bufNr}])`,
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
