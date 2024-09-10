import type { Denops } from "../deps/denops.ts";
import { as, assert, is, maybe } from "../deps/unknownutil.ts";
import { BaseExtension, type Lspoints } from "../interface.ts";
import { omit } from "jsr:@std/collections@~1.0.0/omit";

function getSettings(
  lspoints: Lspoints,
  clientName: string,
): Record<string, unknown> | undefined {
  const client = lspoints.getClient(clientName);
  if (client == null) {
    return;
  }
  const settings = client.options.settings ?? client.options.params?.settings;
  return maybe(settings, is.Record);
}

export class Extension extends BaseExtension {
  #notificationAlreadySent: Record<string, boolean> = {};

  initialize(_denops: Denops, lspoints: Lspoints) {
    lspoints.subscribeAttach(async (clientName) => {
      const settings = getSettings(lspoints, clientName);
      if (settings == null) {
        return;
      }

      if (this.#notificationAlreadySent[clientName]) {
        return;
      }

      await lspoints.notify(clientName, "workspace/didChangeConfiguration", {
        settings: omit(settings, ["clientCapabilities"]),
      });
      this.#notificationAlreadySent[clientName] = true;
    });
    lspoints.subscribeRequest(
      "workspace/configuration",
      (clientName, params) => {
        const settings = getSettings(lspoints, clientName);
        assert(
          params,
          is.ObjectOf({
            items: is.ArrayOf(is.ObjectOf({
              section: as.Optional(is.String),
            })),
          }),
        );
        return params.items.map((item) => settings?.[item.section!] ?? null);
      },
    );
  }
}
