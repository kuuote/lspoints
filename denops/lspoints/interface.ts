import { PatchableObjectBox } from "../@lspoints/box.ts";
import { Denops } from "../@lspoints/deps/denops.ts";
import { LSP } from "../@lspoints/deps/lsp.ts";
import { ArrayOrObject } from "../@lspoints/types/message.ts";

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
