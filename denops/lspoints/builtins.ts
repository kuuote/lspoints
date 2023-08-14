import { Extension as DiagnosticsExtension } from "./builtin/diagnostics.ts";
import { Extension as NvimDiagnosticsExtension } from "./builtin/nvim_diagnostics.ts";
import { Denops } from "./deps/denops.ts";
import { Lspoints } from "./interface.ts";

export async function loadBuiltins(denops: Denops, lspoints: Lspoints) {
  await new DiagnosticsExtension().initialize(denops, lspoints);
  await new NvimDiagnosticsExtension().initialize(denops, lspoints);
}
