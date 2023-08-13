import { Extension as DiagnosticsExtension } from "./builtin/diagnostics.ts";
import { Denops } from "./deps/denops.ts";
import { Lspoints } from "./interface.ts";

export async function loadBuiltins(denops: Denops, lspoints: Lspoints) {
  await new DiagnosticsExtension().initialize(denops, lspoints);
}
