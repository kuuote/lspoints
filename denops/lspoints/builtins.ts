import { Extension as DiagnosticsExtension } from "./builtin/diagnostics.ts";
import { Extension as ConfigurationExtension } from "./builtin/configuration.ts";
import { Denops } from "./deps/denops.ts";
import { Lspoints } from "./interface.ts";

export function loadBuiltins(denops: Denops, lspoints: Lspoints) {
  new DiagnosticsExtension().initialize(denops, lspoints);
  new ConfigurationExtension().initialize(denops, lspoints);
}
