import type { Denops } from "jsr:@denops/std@^7.0.0";
import {
  BaseExtension,
  type Lspoints,
} from "jsr:@kuuote/lspoints@^0.1.0";

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
