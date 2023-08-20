import { Denops } from "../lspoints/deps/denops.ts";
import { LSP } from "../lspoints/deps/lsp.ts";
import { u } from "../lspoints/deps/unknownutil.ts";
import { BaseExtension, Lspoints } from "../lspoints/interface.ts";
import {
  applyTextEdits,
} from "https://deno.land/x/denops_lsputil@v0.5.4/mod.ts";

export class Extension extends BaseExtension {
  initialize(denops: Denops, lspoints: Lspoints) {
    lspoints.defineCommands("format", {
      execute: async (bufnr: unknown, selector?: unknown) => {
        let clients = lspoints.getClients(Number(bufnr)).filter((c) =>
          c.serverCapabilities.documentFormattingProvider != null
        );
        if (u.isString(selector)) {
          clients = clients.filter((c) => c.name === selector);
        }

        if (clients.length == 0) {
          throw Error("何のクライアントも選ばれてないわよ");
        }

        const path = String(await denops.call("expand", "%:p"));

        const result = await lspoints.request(
          clients[0].name,
          "textDocument/formatting",
          {
            textDocument: {
              uri: "file://" + path,
            },
            options: {
              tabSize: Number(await denops.eval("&l:shiftwidth")),
              insertSpaces: Boolean(await denops.eval("&l:expandtab")),
            },
          },
        ) as LSP.TextEdit[] | null;
        if (result == null) {
          return;
        }
        await applyTextEdits(
          denops,
          Number(bufnr),
          result,
        );
      },
    });
  }
}
