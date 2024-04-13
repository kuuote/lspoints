import { loadBuiltins } from "./builtins.ts";
import { autocmd, Denops } from "./deps/denops.ts";
import { is, u } from "./deps/unknownutil.ts";
import { isStartOptions, Settings } from "./interface.ts";
import { isArrayOrObject } from "./jsonrpc/message.ts";
import { Lspoints } from "./lspoints.ts";

const isNumberOrString = is.UnionOf([
  is.Number,
  is.String,
]);

export async function main(denops: Denops) {
  const lspoints = new Lspoints();
  denops.dispatcher = {
    getSettings() {
      return lspoints.settings.get();
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
      u.assert(name, is.String);
      u.assert(startOptions, isStartOptions);
      await lspoints.start(denops, name, startOptions);
    },
    // kill all clients for lspoints#reload
    // to avoids dangling process
    killall() {
      lspoints.killall();
    },
    async attach(id: unknown, bufNr: unknown) {
      u.assert(id, isNumberOrString);
      u.assert(bufNr, is.Number);
      await lspoints.attach(denops, id, bufNr);
    },
    async notifyChange(
      bufNr: unknown,
      uri: unknown,
      text: unknown,
      changedtick: unknown,
    ) {
      u.assert(bufNr, is.Number);
      u.assert(uri, is.String);
      u.assert(text, is.String);
      u.assert(changedtick, is.Number);
      await lspoints.notifyChange(bufNr, uri, text, changedtick);
    },
    getClients(bufNr: unknown) {
      u.assert(bufNr, is.Number);
      return lspoints.getClients(bufNr);
    },
    async notify(
      id: unknown,
      method: unknown,
      params: unknown = {},
    ): Promise<void> {
      u.assert(id, isNumberOrString);
      u.assert(method, is.String);
      u.assert(params, is.OptionalOf(isArrayOrObject));
      await lspoints.notify(id, method, params);
    },
    async request(
      id: unknown,
      method: unknown,
      params: unknown = {},
    ): Promise<unknown> {
      u.assert(id, isNumberOrString);
      u.assert(method, is.String);
      u.assert(params, is.OptionalOf(isArrayOrObject));
      return await lspoints.request(id, method, params);
    },
    async loadExtensions(ext: unknown) {
      u.assert(ext, is.ArrayOf(is.String));
      // from global, must be de-duplicate
      await lspoints.loadExtensions(denops, [...new Set(ext)]);
    },
    async executeCommand(
      extensionName: unknown,
      command: unknown,
      ...args: unknown[]
    ) {
      u.assert(extensionName, is.String);
      u.assert(command, is.String);
      return await lspoints.executeCommand(extensionName, command, ...args);
    },
  };
  await autocmd.group(denops, "lspoints.internal", (helper) => {
    helper.remove("*");
    helper.define("User", "LspointsAttach:*", ":");
  });
  await loadBuiltins(denops, lspoints);
  await denops.dispatcher.loadExtensions(
    await denops.eval("g:lspoints#extensions"),
  );
}
