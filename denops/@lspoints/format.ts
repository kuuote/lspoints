import type { Denops } from "../lspoints/deps/denops.ts";
import type { LSP } from "../lspoints/deps/lsp.ts";
import { deadline } from "../lspoints/deps/std/async.ts";
import { assert, is } from "../lspoints/deps/unknownutil.ts";
import { BaseExtension, type Lspoints } from "../lspoints/interface.ts";
import {
  applyTextEdits,
  uriFromBufnr,
} from "jsr:@uga-rosa/denops-lsputil@^0.10.1";

export class Extension extends BaseExtension {
  initialize(denops: Denops, lspoints: Lspoints) {
    lspoints.defineCommands("format", {
      execute: async (bufnr: unknown, timeout = 5000, selector?: unknown) => {
        assert(timeout, is.Number);
        assert(bufnr, is.Number);
        let clients = lspoints.getClients(bufnr).filter((c) =>
          c.serverCapabilities.documentFormattingProvider != null
        );
        if (is.String(selector)) {
          clients = clients.filter((c) => c.name === selector);
        }

        if (clients.length == 0) {
          throw Error("何のクライアントも選ばれてないわよ");
        }

        const resultPromise = lspoints.request(
          clients[0].name,
          "textDocument/formatting",
          {
            textDocument: {
              uri: await uriFromBufnr(denops, bufnr),
            },
            options: {
              tabSize: Number(await denops.call("shiftwidth")),
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
        await applyTextEdits(denops, bufnr, result);
      },
    });
  }
}
