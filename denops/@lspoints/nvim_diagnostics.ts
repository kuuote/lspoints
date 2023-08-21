import { Denops } from "../lspoints/deps/denops.ts";
import { LSP } from "../lspoints/deps/lsp.ts";
import { BaseExtension, Lspoints } from "../lspoints/interface.ts";

export class Extension extends BaseExtension {
  diagnostics: Map<string, Map<number, Array<LSP.Diagnostic>>> = new Map();

  initialize(denops: Denops, lspoints: Lspoints) {
    if (denops.meta.host !== "nvim") {
      return;
    }
    lspoints.subscribeNotify(
      "textDocument/publishDiagnostics",
      async (client, _params) => {
        const params = _params as LSP.PublishDiagnosticsParams;
        const path = params.uri.replace(/^file:\/\//, "");
        const bufnr = Number(await denops.call("bufnr", path));
        if (bufnr == -1) {
          return;
        }
        await denops.call("luaeval", "require('lspoints').notify(_A)", {
          client,
          bufnr,
          diagnostics: params.diagnostics.map((d) => ({
            lnum: d.range.start.line,
            end_lnum: d.range["end"].line,
            col: d.range.start.character,
            end_col: d.range["end"].character,
            severity: d.severity,
            message: d.message,
            source: d.source,
            code: d.code,
          })),
        });
      },
    );
  }
}
