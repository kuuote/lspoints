import { PatchableObjectBox } from "./box.ts";
import { LanguageClient } from "./client.ts";
import { Lock } from "./deps/async.ts";
import { autocmd, Denops } from "./deps/denops.ts";
import { stdpath } from "./deps/std.ts";
import {
  BaseExtension,
  Client,
  Command,
  NotifyCallback,
  Settings,
} from "./interface.ts";
import { ArrayOrObject } from "./jsonrpc/message.ts";

const lock = new Lock(null);

export class Lspoints {
  commands: Record<string, Record<string, Command>> = {};
  notifiers: Record<string, Array<NotifyCallback>> = {};
  clients: Record<string, LanguageClient> = {};
  settings: PatchableObjectBox<Settings> = new PatchableObjectBox({
    clientCapabilites: {
      textDocument: {
        // https://github.com/hrsh7th/cmp-nvim-lsp/blob/44b16d11215dce86f253ce0c30949813c0a90765/lua/cmp_nvim_lsp/init.lua#L37
        completion: {
          dynamicRegistration: false,
          completionItem: {
            snippetSupport: true,
            commitCharactersSupport: true,
            deprecatedSupport: true,
            preselectSupport: true,
            tagSupport: {
              valueSet: [
                1, // Deprecated
              ],
            },
            insertReplaceSupport: true,
            resolveSupport: {
              properties: [
                "documentation",
                "detail",
                "additionalTextEdits",
                "sortText",
                "filterText",
                "insertText",
                "textEdit",
                "insertTextFormat",
                "insertTextMode",
              ],
            },
            insertTextModeSupport: {
              valueSet: [
                1, // asIs
                2, // adjustIndentation
              ],
            },
            labelDetailsSupport: true,
          },
          contextSupport: true,
          insertTextMode: 1,
          completionList: {
            itemDefaults: [
              "commitCharacters",
              "editRange",
              "insertTextFormat",
              "insertTextMode",
              "data",
            ],
          },
        },
      },
    },
  });

  async start(
    denops: Denops,
    name: string,
    options: Record<string, unknown> = {},
  ) {
    if (this.clients[name] == null) {
      await lock.lock(async () => {
        // TODO: optionsに型を与えること
        // TODO: TCP接続とか対応する
        this.clients[name] = await new LanguageClient(
          denops,
          name,
          options.cmd as string[],
        )
          .initialize(options, this.settings.get());
        this.clients[name].rpcClient.notifiers.push(async (msg) => {
          for (const notifier of this.notifiers[msg.method] ?? []) {
            await notifier(name, msg.params);
          }
        });
      });
    }
  }

  async attach(denops: Denops, name: string, bufNr: number) {
    await lock.lock(async () => {
      const client = this.clients[name];
      if (client == null) {
        throw Error(`client "${name}" is not started`);
      }
      await client.attach(bufNr);
    });
    await autocmd.group(
      denops,
      "lspoints.internal",
      (helper) => {
        helper.remove("*", "<buffer>");
        helper.define(
          ["TextChanged", "TextChangedI"],
          "<buffer>",
          `call lspoints#internal#notify_change(${bufNr})`,
        );
      },
    );
    await autocmd.emit(denops, "User", `LspointsAttach:${name}`);
  }

  async notifyChange(
    bufNr: number,
    uri: string,
    text: string,
    changedtick: number,
  ) {
    const clients = Object.values(this.clients)
      .filter((client) => client.isAttached(bufNr));
    for (const client of clients) {
      await client.notifyChange(bufNr, uri, text, changedtick);
    }
  }

  getClients(bufNr: number): Client[] {
    return Object.entries(this.clients)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .filter((entry) => entry[1].isAttached(bufNr))
      .map((entry) => ({
        name: entry[0],
        serverCapabilities: entry[1].serverCapabilities,
      }));
  }

  async request(name: string, method: string, params: ArrayOrObject = {}) {
    if (lock.locked) {
      await lock.lock(() => {});
    }
    const client = this.clients[name];
    if (client == null) {
      throw Error(`client "${name}" is not started`);
    }
    return await client.rpcClient.request(method, params);
  }

  async loadExtensions(denops: Denops, path: string[]) {
    await lock.lock(async () => {
      for (let p of path) {
        if (p.indexOf("/") == -1) {
          p = String(
            await denops.eval(
              `globpath(&runtimepath, 'denops/@lspoints/${p}.ts')`,
            ),
          ).replace(/\n.*/, "");
        }
        // NOTE: Import module with fragment so that reload works properly.
        // https://github.com/vim-denops/denops.vim/issues/227
        const mod = await import(
          `${stdpath.toFileUrl(p).href}#${performance.now()}`
        );
        await (new mod.Extension() as BaseExtension).initialize(denops, this);
      }
    });
  }

  subscribeNotify(
    method: string,
    callback: NotifyCallback,
  ) {
    (this.notifiers[method] = this.notifiers[method] ?? []).push(callback);
  }

  defineCommands(extensionName: string, commands: Record<string, Command>) {
    this.commands[extensionName] = commands;
  }

  async executeCommand(
    extensionName: string,
    command: string,
    ...args: unknown[]
  ): Promise<unknown> {
    return await this.commands[extensionName][command](...args);
  }
}

export const lspoints = new Lspoints();
