import { autocmd, type Denops } from "../deps/denops.ts";
import { BaseExtension, type Lspoints } from "../interface.ts";

export class Extension extends BaseExtension {
  async initialize(denops: Denops, lspoints: Lspoints) {
    await autocmd.group(denops, "lspoints.internal", (helper) => {
      helper.define(
        "BufWritePost",
        "*",
        "call denops#notify('lspoints', 'executeCommand', ['lspoints.did_save', 'handle', bufnr()])",
      );
    });
    lspoints.defineCommands("lspoints.did_save", {
      handle: (_bufnr: unknown) => {
        const bufnr = Number(_bufnr);
        for (const client of lspoints.getClients(bufnr)) {
          client.notify("textDocument/didSave", {
            textDocument: {
              uri: client.getUriFromBufNr(bufnr),
            },
          });
        }
      },
    });
  }
}
