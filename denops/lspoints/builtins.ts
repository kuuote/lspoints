import { Extension as ConfigurationExtension } from "./builtin/configuration.ts";
import { Extension as DiagnosticsExtension } from "./builtin/diagnostics.ts";
import { Extension as DidSaveExtension } from "./builtin/did_save.ts";
import type { Denops } from "./deps/denops.ts";
import type { Lspoints } from "./interface.ts";

export async function loadBuiltins(denops: Denops, lspoints: Lspoints) {
  new DiagnosticsExtension().initialize(denops, lspoints);
  new ConfigurationExtension().initialize(denops, lspoints);
  await new DidSaveExtension().initialize(denops, lspoints);
}
