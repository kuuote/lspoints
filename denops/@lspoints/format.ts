import { Denops } from "../lspoints/deps/denops.ts";
import { LSP } from "../lspoints/deps/lsp.ts";
import { deadline } from "../lspoints/deps/std/async.ts";
import { u } from "../lspoints/deps/unknownutil.ts";
import { BaseExtension, Lspoints } from "../lspoints/interface.ts";
import {
  applyTextEdits,
} from "https://deno.land/x/denops_lsputil@v0.6.1/mod.ts";

export class Extension extends BaseExtension {
  initialize(denops: Denops, lspoints: Lspoints) {
    lspoints.defineCommands("format", {
      execute: async (bufnr: unknown, timeout = 5000, selector?: unknown) => {
        u.assert(timeout, u.isNumber);
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

        const resultPromise = lspoints.request(
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
        ) as Promise<LSP.TextEdit[] | null>;
        const result = await deadline(resultPromise, timeout)
          .catch(async () => {
            await denops.cmd(`
                             echohl Error
                             echomsg "Timeout!"
                             echohl None
                             `);
          });
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
