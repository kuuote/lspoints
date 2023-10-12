import { Denops } from "https://deno.land/x/lspoints@v0.0.3/deps/denops.ts";
import {
  BaseExtension,
  Lspoints,
} from "https://deno.land/x/lspoints@v0.0.3/interface.ts";

// place to {runtimepath}/denops/@lspoints/config.ts

export class Extension extends BaseExtension {
  override initialize(_denops: Denops, lspoints: Lspoints) {
    lspoints.settings.patch({
      startOptions: {
        // TypeScript way to given options
        denols: {
          cmd: ["deno", "lsp"],
          initializationOptions: {
            enable: true,
            unstable: true,
          },
        },
        luals: {
          cmd: ["lua-language-server"],
          params: {
            settings: {
              Lua: {
                diagnostics: {
                  globals: ["vim"],
                },
              },
            },
          },
        },
      },
    });
  }
}
