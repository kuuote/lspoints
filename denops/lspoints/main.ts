import { unknownutil as u } from "../@lspoints/deps.ts";
import { Lock } from "../@lspoints/deps/async.ts";
import { Denops } from "../@lspoints/deps/denops.ts";
import { autocmd } from "../@lspoints/deps/denops.ts";
import { isArrayOrObject } from "../@lspoints/types/message.ts";
import { LanguageClient } from "./client.ts";
import * as store from "./store.ts";

const lock = new Lock(null);

export async function main(denops: Denops) {
  denops.dispatcher = {
    async start(
      name: unknown,
      command: unknown,
      options: unknown = {},
    ) {
      u.assert(name, u.isString);
      u.assert(command, u.isArrayOf(u.isString));
      u.assert(options, u.isRecord);
      if (store.clients[name] == null) {
        await lock.lock(async () => {
          store.clients[name] = await new LanguageClient(denops, name, command)
            .initialize(options);
          // TODO: adhoc approachなのでちゃんとしたIF作る
          store.clients[name].rpcClient.subscribeNotify(async (msg) => {
            await denops.call("luaeval", "require('lspoints').notify(_A)", msg)
              .catch(console.log);
          });
        });
      }
    },
    async attach(name: unknown, bufNr: unknown) {
      u.assert(name, u.isString);
      u.assert(bufNr, u.isNumber);
      await lock.lock(async () => {
        const client = store.clients[name];
        if (client == null) {
          throw Error(`client "${name}" is not started`);
        }
        await client.attach(bufNr);
      });
    },
    async notifyChange(bufNr: unknown) {
      u.assert(bufNr, u.isNumber);
      const clients = Object.values(store.clients)
        .filter((client) => client.isAttached(bufNr));
      if (clients.length === 0) {
        return;
      }
      const text =
        (await denops.call("getbufline", bufNr, 1, "$") as string[]).join(
          "\n",
        ) + "\n";
      const changedtick = Number(
        await denops.call("getbufvar", bufNr, "changedtick"),
      );
      for (const client of clients) {
        client.notifyChange(bufNr, text, changedtick);
      }
    },
    getClients(bufNr: unknown) {
      u.assert(bufNr, u.isNumber);
      return Object.entries(store.clients)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .filter((entry) => entry[1].isAttached(bufNr))
        .map((entry) => ({
          name: entry[0],
          serverCapabilities: entry[1].serverCapabilities,
        }));
    },
    async request(name: unknown, method: unknown, params: unknown = {}) {
      u.assert(name, u.isString);
      u.assert(method, u.isString);
      u.assert(params, u.isOptionalOf(isArrayOrObject));
      if (lock.locked) {
        await lock.lock(() => {});
      }
      const client = store.clients[name];
      if (client == null) {
        throw Error(`client "${name}" is not started`);
      }
      return await client.rpcClient.request(method, params);
    },
  };
  await autocmd.group(denops, "lspoints.internal", (helper) => {
    helper.remove("*");
  });
}
