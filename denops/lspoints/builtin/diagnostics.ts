import type { Denops } from "../deps/denops.ts";
import type { LSP } from "../deps/lsp.ts";
import { BaseExtension, type Lspoints } from "../interface.ts";

type FlatDiagnostic = {
  client: string;
  bufnr: number;
  diagnostic: LSP.Diagnostic;
};

function ensure<T, U>(map: Map<T, U>, key: T, def: () => U): U {
  const value = map.get(key);
  if (value != null) {
    return value;
  }
  const defValue = def();
  map.set(key, defValue);
  return defValue;
}

export class Extension extends BaseExtension {
  diagnostics: Map<string, Map<number, Array<LSP.Diagnostic>>> = new Map();

  initialize(denops: Denops, lspoints: Lspoints) {
    lspoints.subscribeNotify(
      "textDocument/publishDiagnostics",
      async (clientName, _params) => {
        const params = _params as LSP.PublishDiagnosticsParams;
        const path = params.uri.replace(/^file:\/\//, "");
        const bufNr = Number(await denops.call("bufnr", path));
        if (bufNr == -1) {
          return;
        }
        const diagnosticsMap = ensure(
          this.diagnostics,
          clientName,
          () => new Map(),
        );
        if (params.diagnostics.length == 0) {
          diagnosticsMap.delete(bufNr);
        } else {
          diagnosticsMap.set(bufNr, params.diagnostics);
        }
      },
    );
    lspoints.subscribeDetach((clientName) => {
      this.diagnostics.delete(clientName);
    });
    lspoints.defineCommands("lspoints.diagnostics", {
      get: () => this.diagnostics,
      getFlat: () => {
        const result: FlatDiagnostic[][] = [];
        for (const [client, nd] of this.diagnostics.entries()) {
          for (const [bufnr, diagnostics] of nd.entries()) {
            result.push(diagnostics.map((diagnostic) => ({
              client,
              bufnr,
              diagnostic,
            })));
          }
        }
        return result.flat();
      },
    });
  }
}
