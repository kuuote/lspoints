import { PatchableObjectBox } from "./box.ts";
import { Denops } from "./deps/denops.ts";
import { LSP } from "./deps/lsp.ts";
import { ArrayOrObject } from "./jsonrpc/message.ts";

export type Settings = {
  clientCapabilites: LSP.ClientCapabilities;
};

export interface Lspoints {
  readonly settings: PatchableObjectBox<Settings>;

  request(
    name: string,
    method: string,
    params: ArrayOrObject,
  ): Promise<unknown>;
}

export abstract class Extension {
  abstract initialize(denops: Denops, lspoints: Lspoints): void | Promise<void>;
}
