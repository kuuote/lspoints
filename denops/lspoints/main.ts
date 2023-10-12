import { loadBuiltins } from "./builtins.ts";
import { autocmd, Denops } from "./deps/denops.ts";
import { u } from "./deps/unknownutil.ts";
import { isStartOptions, Settings } from "./interface.ts";
import { isArrayOrObject } from "./jsonrpc/message.ts";
import { lspoints } from "./lspoints.ts";

const isNumberOrString = u.isOneOf([
  u.isNumber,
  u.isString,
]);

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
      startOptions: unknown = {},
    ) {
      u.assert(name, u.isString);
      u.assert(startOptions, isStartOptions);
      await lspoints.start(denops, name, startOptions);
    },
    async attach(id: unknown, bufNr: unknown) {
      u.assert(id, isNumberOrString);
      u.assert(bufNr, u.isNumber);
      await lspoints.attach(denops, id, bufNr);
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
    async notify(
      id: unknown,
      method: unknown,
      params: unknown = {},
    ): Promise<void> {
      u.assert(id, isNumberOrString);
      u.assert(method, u.isString);
      u.assert(params, u.isOptionalOf(isArrayOrObject));
      await lspoints.notify(id, method, params);
    },
    async request(
      id: unknown,
      method: unknown,
      params: unknown = {},
    ): Promise<unknown> {
      u.assert(id, isNumberOrString);
      u.assert(method, u.isString);
      u.assert(params, u.isOptionalOf(isArrayOrObject));
      return await lspoints.request(id, method, params);
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
    helper.define("User", "LspointsAttach:*", ":");
  });
  loadBuiltins(denops, lspoints);
}
