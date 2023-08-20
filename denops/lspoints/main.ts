import { loadBuiltins } from "./builtins.ts";
import { autocmd, Denops } from "./deps/denops.ts";
import { u } from "./deps/unknownutil.ts";
import { Settings } from "./interface.ts";
import { isArrayOrObject } from "./jsonrpc/message.ts";
import { lspoints } from "./lspoints.ts";

export async function main(denops: Denops) {
  denops.dispatcher = {
    getSettings(settings: unknown) {
      return lspoints.settings.set(settings as Settings);
    },
    setSettings(settings: unknown) {
      lspoints.settings.set(settings as Settings);
    },
    patchSettings(settings: unknown) {
      lspoints.settings.patch(settings as Settings);
    },
    async start(
      name: unknown,
      options: unknown = {},
    ) {
      u.assert(name, u.isString);
      u.assert(options, u.isRecord);
      await lspoints.start(denops, name, options);
    },
    async attach(name: unknown, bufNr: unknown) {
      u.assert(name, u.isString);
      u.assert(bufNr, u.isNumber);
      await lspoints.attach(name, bufNr);
    },
    async notifyChange(
      bufNr: unknown,
      uri: unknown,
      text: unknown,
      changedtick: unknown,
    ) {
      u.assert(bufNr, u.isNumber);
      u.assert(uri, u.isString);
      u.assert(text, u.isString);
      u.assert(changedtick, u.isNumber);
      await lspoints.notifyChange(bufNr, uri, text, changedtick);
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
    async loadExtensions(ext: unknown) {
      u.assert(ext, u.isArrayOf(u.isString));
      await lspoints.loadExtensions(denops, ext);
    },
    async executeCommand(
      extensionName: unknown,
      command: unknown,
      ...args: unknown[]
    ) {
      u.assert(extensionName, u.isString);
      u.assert(command, u.isString);
      return await lspoints.executeCommand(extensionName, command, ...args);
    },
  };
  await autocmd.group(denops, "lspoints.internal", (helper) => {
    helper.remove("*");
  });
  await loadBuiltins(denops, lspoints);
}
