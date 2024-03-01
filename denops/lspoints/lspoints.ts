import { PatchableObjectBox } from "./box.ts";
import { LanguageClient } from "./client.ts";
import { Lock } from "./deps/async.ts";
import { autocmd, Denops } from "./deps/denops.ts";
import { deadline, DeadlineError } from "./deps/std/async.ts";
import { deepMerge } from "./deps/std/deep_merge.ts";
import { stdpath } from "./deps/std/path.ts";
import {
  AttachCallback,
  BaseExtension,
  Client,
  Command,
  NotifyCallback,
  RequestCallback,
  Settings,
  StartOptions,
} from "./interface.ts";
import { ArrayOrObject } from "./jsonrpc/message.ts";

const lock = new Lock(null);

// transform client implementation to description object
function transformClient(client: LanguageClient): Client {
  return {
    name: client.name,
    id: client.id,
    serverCapabilities: client.serverCapabilities,
    getUriFromBufNr: client.getUriFromBufNr.bind(client),
    getDocumentVersion: client.getDocumentVersion.bind(client),
    isAttached: client.isAttached.bind(client),
    options: client.options,
  };
}

export class Lspoints {
  commands: Record<string, Record<string, Command>> = {};
  attachHandlers: Array<AttachCallback> = [];
  notifyHandlers: Record<string, Array<NotifyCallback>> = {};
  requestHandlers: Record<string, Array<RequestCallback>> = {};
  clients: Record<string, LanguageClient> = {};
  clientIDs: Record<number, LanguageClient> = {};
  settings: PatchableObjectBox<Settings> = new PatchableObjectBox({
    clientCapabilites: {
      general: {
        positionEncodings: [
          "utf-16",
        ],
      },
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
    requestTimeout: 5000,
    startOptions: {},
  });

  #getClient(id: number | string): LanguageClient | undefined {
    if (typeof id === "number") {
      return this.clientIDs[id];
    } else {
      return this.clients[id];
    }
  }

  async start(
    denops: Denops,
    name: string,
    options: StartOptions = {},
  ) {
    if (this.clients[name] == null) {
      await lock.lock(async () => {
        const defaultOptions = this.settings.get().startOptions[name];
        if (defaultOptions != null) {
          options = deepMerge(defaultOptions, options, {
            arrays: "replace",
          });
        }
        // TODO: TCP接続とか対応する
        const client = await new LanguageClient(
          denops,
          name,
          options,
        )
          .initialize(this.settings.get());
        this.clients[name] = client;
        this.clientIDs[client.id] = client;
        client.rpcClient.notifyHandlers.push(async (msg) => {
          for (const notifier of this.notifyHandlers[msg.method] ?? []) {
            await notifier(name, msg.params);
          }
        });
        client.rpcClient.requestHandlers.push(async (msg) => {
          for (const handler of this.requestHandlers[msg.method] ?? []) {
            const result = await handler(name, msg.params);
            if (result !== undefined) {
              return result;
            }
          }
        });
      });
    }
  }

  async attach(denops: Denops, id: string | number, bufNr: number) {
    let name = "";
    await lock.lock(async () => {
      const client = this.#getClient(id);
      if (client == null) {
        throw Error(`client "${id}" is not started`);
      }
      name = client.name;
      await client.attach(bufNr);
    });
    for (const handler of this.attachHandlers) {
      await handler(name);
    }
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

  getClient(name: number | string): Client | undefined {
    const client = this.#getClient(name);
    if (client == null) {
      return;
    }
    return transformClient(client);
  }

  getClients(bufNr: number): Client[] {
    return Object.entries(this.clients)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .filter((entry) => entry[1].isAttached(bufNr))
      .map((entry) => transformClient(entry[1]));
  }

  async notify(
    id: string | number,
    method: string,
    params: ArrayOrObject = {},
  ): Promise<void> {
    if (lock.locked) {
      await lock.lock(() => {});
    }
    const client = this.#getClient(id);
    if (client == null) {
      throw Error(`client "${id}" is not started`);
    }
    await client.rpcClient.notify(method, params);
  }

  async request(
    id: string | number,
    method: string,
    params: ArrayOrObject = {},
  ): Promise<unknown> {
    if (lock.locked) {
      await lock.lock(() => {});
    }
    const client = this.#getClient(id);
    if (client == null) {
      throw Error(`client "${id}" is not started`);
    }
    const timeout = this.settings.get().requestTimeout;
    return await deadline(client.rpcClient.request(method, params), timeout)
      .catch((e) => {
        if (!(e instanceof DeadlineError)) {
          return Promise.reject(e);
        }
        return client.denops.cmd(
          [
            "echohl Error",
            'echomsg "lspoints: request timeout"',
            "echomsg client",
            "echomsg method",
            "for p in params | echomsg p | endfor",
            "echohl None",
          ].join("\n"),
          {
            client: "client: " + client.name,
            method: "method: " + method,
            params: ("params: " + JSON.stringify(params, undefined, "  "))
              .split("\n"),
          },
        );
      });
  }

  async loadExtensions(denops: Denops, path: string[]) {
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
  }

  subscribeAttach(callback: AttachCallback) {
    (this.attachHandlers = this.attachHandlers ?? []).push(callback);
  }

  subscribeNotify(
    method: string,
    callback: NotifyCallback,
  ) {
    (this.notifyHandlers[method] = this.notifyHandlers[method] ?? []).push(
      callback,
    );
  }

  subscribeRequest(
    method: string,
    callback: RequestCallback,
  ) {
    (this.requestHandlers[method] = this.requestHandlers[method] ?? []).push(
      callback,
    );
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
