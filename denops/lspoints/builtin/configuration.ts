import { Denops } from "../deps/denops.ts";
import { u } from "../deps/unknownutil.ts";
import { BaseExtension, Lspoints } from "../interface.ts";

function getSettings(
  lspoints: Lspoints,
  clientName: string,
): Record<string, unknown> | undefined {
  const client = lspoints.getClient(clientName);
  if (client == null) {
    return;
  }
  const settings = client.options.settings ?? client.options.params?.settings;
  return u.maybe(settings, u.isRecord);
}

export class Extension extends BaseExtension {
  initialize(_denops: Denops, lspoints: Lspoints) {
    lspoints.subscribeAttach(async (clientName) => {
      const settings = getSettings(lspoints, clientName);
      if (settings == null) {
        return;
      }
      await lspoints.notify(clientName, "workspace/didChangeConfiguration", {
        settings,
      });
    });
    lspoints.subscribeRequest(
      "workspace/configuration",
      (clientName, params) => {
        const settings = getSettings(lspoints, clientName);
        u.assert(
          params,
          u.isObjectOf({
            items: u.isArrayOf(u.isObjectOf({
              section: u.isOptionalOf(u.isString),
            })),
          }),
        );
        return params.items.map((item) => settings?.[item.section!] ?? null);
      },
    );
  }
}
