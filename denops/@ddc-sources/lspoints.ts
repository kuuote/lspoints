import {
  BaseSource,
  type GatherArguments,
} from "jsr:@shougo/ddc-vim@^7.0.0/source";
import type { Item } from "jsr:@shougo/ddc-vim@^7.0.0/types";
import * as u from "jsr:@core/unknownutil@^4.3.0";
import type * as LSPTypes from "npm:vscode-languageserver-types@3.17.5";

type Never = Record<never, never>;

const isClients = u.isArrayOf(
  u.isObjectOf({
    name: u.isString,
    serverCapabilities: u.isRecord,
  }),
);

export class Source extends BaseSource<Never> {
  override async gather({
    denops,
  }: GatherArguments<Never>): Promise<Item[]> {
    const bufNr = Number(await denops.call("bufnr"));
    const _clients = await denops.dispatch("lspoints", "getClients", bufNr);
    u.assert(_clients, isClients);
    const clients = _clients.filter((client) =>
      client.serverCapabilities.completionProvider != null
    );
    if (clients.length === 0) {
      return [];
    }
    const uri = String(
      await denops.call("lspoints#util#bufnr_to_uri", bufNr),
    );
    const line = Number(await denops.call("line", "."));
    const col = Number(await denops.call("col", "."));
    const params = {
      textDocument: {
        uri,
      },
      // TODO: マルチバイト文字を考慮していないのでちゃんと計算すること
      position: {
        line: line - 1,
        character: col - 1,
      },
    };
    const items = await Promise.all(clients.map(async (client) => {
      const result = await denops.dispatch(
        "lspoints",
        "request",
        client.name,
        "textDocument/completion",
        params,
      ) as {
        items: LSPTypes.CompletionItem[];
      } | null;
      if (result == null) {
        return [];
      }
      return Promise.resolve(result.items.map((i) => ({
        abbr: i.label,
        word: i.insertText ?? i.label,
      })));
    })).then((items) => items.flat());
    return items;
  }

  override params(): Never {
    return {};
  }
}
