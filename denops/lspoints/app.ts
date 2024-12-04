import { loadBuiltins } from "./builtins.ts";
import { autocmd, type Denops, type Entrypoint } from "./deps/denops.ts";
import { as, assert, is } from "./deps/unknownutil.ts";
import { isStartOptions, type Settings } from "./interface.ts";
import { isArrayOrObject } from "./jsonrpc/message.ts";
import { Lspoints } from "./lspoints.ts";

const isNumberOrString = is.UnionOf([
  is.Number,
  is.String,
]);

export const main: Entrypoint = async (denops: Denops) => {
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
      assert(name, is.String);
      assert(startOptions, isStartOptions);
      await lspoints.start(denops, name, startOptions);
    },
    async attach(id: unknown, bufNr: unknown) {
      assert(id, isNumberOrString);
      assert(bufNr, is.Number);
      await lspoints.attach(denops, id, bufNr);
    },
    detach(id: unknown) {
      assert(id, isNumberOrString);
      lspoints.detach(id);
    },
    async notifyChange(
      bufNr: unknown,
      uri: unknown,
      text: unknown,
      changedtick: unknown,
    ) {
      assert(bufNr, is.Number);
      assert(uri, is.String);
      assert(text, is.String);
      assert(changedtick, is.Number);
      await lspoints.notifyChange(bufNr, uri, text, changedtick);
    },
    getClients(bufNr: unknown) {
      assert(bufNr, is.Number);
      return lspoints.getClients(bufNr);
    },
    async notify(
      id: unknown,
      method: unknown,
      params: unknown = {},
    ): Promise<void> {
      assert(id, isNumberOrString);
      assert(method, is.String);
      assert(params, as.Optional(isArrayOrObject));
      await lspoints.notify(id, method, params);
    },
    async request(
      id: unknown,
      method: unknown,
      params: unknown = {},
    ): Promise<unknown> {
      assert(id, isNumberOrString);
      assert(method, is.String);
      assert(params, as.Optional(isArrayOrObject));
      return await lspoints.request(id, method, params);
    },
    async loadExtensions(ext: unknown) {
      assert(ext, is.ArrayOf(is.String));
      // from global, must be de-duplicate
      await lspoints.loadExtensions(denops, [...new Set(ext)]);
    },
    async executeCommand(
      extensionName: unknown,
      command: unknown,
      ...args: unknown[]
    ) {
      assert(extensionName, is.String);
      assert(command, is.String);
      return await lspoints.executeCommand(extensionName, command, ...args);
    },
  };
  await autocmd.group(denops, "lspoints.internal", (helper) => {
    helper.remove("*");
    helper.define("User", "LspointsAttach:*", ":");
    helper.define("User", "LspointsDetach:*", ":");
  });
  await loadBuiltins(denops, lspoints);
  await denops.dispatcher.loadExtensions(
    await denops.eval("g:lspoints#extensions"),
  );
  return {
    [Symbol.asyncDispose]: async () => {
      lspoints.killall();
      await autocmd.group(denops, "lspoints.internal", (helper) => {
        helper.remove("*");
      });
    },
  };
};
