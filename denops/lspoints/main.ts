import { unknownutil as u } from "../@lspoints/deps.ts";
import { Denops } from "../@lspoints/deps/denops.ts";
import { autocmd } from "../@lspoints/deps/denops.ts";
import { isArrayOrObject } from "../@lspoints/types/message.ts";
import { lspoints } from "./lspoints.ts";

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
      await lspoints.start(denops, name, command, options);
    },
    async attach(name: unknown, bufNr: unknown) {
      u.assert(name, u.isString);
      u.assert(bufNr, u.isNumber);
      await lspoints.attach(name, bufNr);
    },
    async notifyChange(bufNr: unknown, changedtick: unknown) {
      u.assert(bufNr, u.isNumber);
      u.assert(changedtick, u.isNumber);
      await lspoints.notifyChange(bufNr, changedtick);
    },
    getClients(bufNr: unknown) {
      u.assert(bufNr, u.isNumber);
      return lspoints.getClients(bufNr);
    },
    async request(name: unknown, method: unknown, params: unknown = {}) {
      u.assert(name, u.isString);
      u.assert(method, u.isString);
      u.assert(params, u.isOptionalOf(isArrayOrObject));
      return await lspoints.request(name, method, params);
    },
    async loadExtensions(path: unknown) {
      u.assert(path, u.isArrayOf(u.isString));
      await lspoints.loadExtensions(path);
    },
  };
  await autocmd.group(denops, "lspoints.internal", (helper) => {
    helper.remove("*");
  });
}
