import { PatchableObjectBox } from "./box.ts";
import { Denops } from "./deps/denops.ts";
import { LSP } from "./deps/lsp.ts";
import { u } from "./deps/unknownutil.ts";
import { ArrayOrObject } from "./jsonrpc/message.ts";

export type Client = {
  name: string;
  id: number;
  serverCapabilities: LSP.ServerCapabilities;
  getUriFromBufNr(bufnr: number): string;
};

export const isStartOptions = u.isObjectOf({
  cmd: u.isOptionalOf(u.isArrayOf(u.isString)),
  initializationOptions: u.isOptionalOf(u.isRecord),
  params: u.isOptionalOf(u.isRecord),
  rootPath: u.isOptionalOf(u.isString),
  rootUri: u.isOptionalOf(u.isString),
});

export type StartOptions = u.PredicateType<typeof isStartOptions>;

export type Settings = {
  startOptions: Record<string, StartOptions>;
  clientCapabilites: LSP.ClientCapabilities;
  tracePath?: string;
};

export type NotifyCallback = (
  clientName: string,
  params: unknown,
) => void | Promise<void>;

export type CommandResult = unknown | Promise<unknown>;
export type Command = (...args: unknown[]) => CommandResult;

export interface Lspoints {
  readonly settings: PatchableObjectBox<Settings>;

  getClients(bufNr: number): Client[];

  request(
    name: string,
    method: string,
    params: ArrayOrObject,
  ): Promise<unknown>;

  subscribeNotify(
    method: string,
    callback: NotifyCallback,
  ): void;

  defineCommands(
    extensionName: string,
    commands: Record<string, Command>,
  ): void;

  executeCommand(
    extensionName: string,
    command: string,
    ...args: unknown[]
  ): CommandResult;
}

export abstract class BaseExtension {
  abstract initialize(denops: Denops, lspoints: Lspoints): void | Promise<void>;
}
