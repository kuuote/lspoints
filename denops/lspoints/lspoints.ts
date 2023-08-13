import { PatchableObjectBox } from "../@lspoints/box.ts";
import { Lock } from "../@lspoints/deps/async.ts";
import { Denops } from "../@lspoints/deps/denops.ts";
import { ArrayOrObject } from "../@lspoints/types/message.ts";
import { LanguageClient } from "./client.ts";
import { Settings } from "./interface.ts";

const lock = new Lock(null);

export class Lspoints {
  clients: Record<string, LanguageClient> = {};
  settings: PatchableObjectBox<Settings> = new PatchableObjectBox({
    clientCapabilites: {},
  });

  async start(
    denops: Denops,
    name: string,
    command: string[],
    options: Record<string, unknown> = {},
  ) {
    if (this.clients[name] == null) {
      await lock.lock(async () => {
        this.clients[name] = await new LanguageClient(denops, name, command)
          .initialize(options);
        // TODO: adhoc approachなのでちゃんとしたIF作る
        this.clients[name].rpcClient.subscribeNotify(async (msg) => {
          await denops.call("luaeval", "require('lspoints').notify(_A)", msg)
            .catch(console.log);
        });
      });
    }
  }

  async attach(name: string, bufNr: number) {
    await lock.lock(async () => {
      const client = this.clients[name];
      if (client == null) {
        throw Error(`client "${name}" is not started`);
      }
      await client.attach(bufNr);
    });
  }

  async notifyChange(bufNr: number, changedtick: number) {
    const clients = Object.values(this.clients)
      .filter((client) => client.isAttached(bufNr));
    if (clients.length === 0) {
      return;
    }
    const denops = clients[0].denops;
    const text =
      (await denops.call("getbufline", bufNr, 1, "$") as string[]).join(
        "\n",
      ) + "\n";
    for (const client of clients) {
      client.notifyChange(bufNr, text, changedtick);
    }
  }

  getClients(bufNr: number) {
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

  async loadExtensions(path: string[]) {
    await lock.lock(async () => {
    });
  }
}

export const lspoints = new Lspoints();
