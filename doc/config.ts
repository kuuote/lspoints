import { Denops } from "https://deno.land/x/lspoints@v0.0.7/deps/denops.ts";
import {
  BaseExtension,
  Lspoints,
} from "https://deno.land/x/lspoints@v0.0.7/interface.ts";

// place to {runtimepath}/denops/@lspoints/config.ts

export class Extension extends BaseExtension {
  override initialize(_denops: Denops, lspoints: Lspoints) {
    lspoints.settings.patch({
      startOptions: {
        // TypeScript way to given options
        denols: {
          cmd: ["deno", "lsp"],
          settings: {
            deno: {
              enable: true,
              unstable: true,
            },
          },
        },
        luals: {
          cmd: ["lua-language-server"],
          settings: {
            Lua: {
              diagnostics: {
                globals: ["vim"],
              },
            },
          },
        },
      },
    });
  }
}
