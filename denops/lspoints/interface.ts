import { PatchableObjectBox } from "./box.ts";
import { Denops } from "./deps/denops.ts";
import { LSP } from "./deps/lsp.ts";
import { u } from "./deps/unknownutil.ts";
import { ArrayOrObject } from "./jsonrpc/message.ts";

type Promisify<T> = T | Promise<T>;

export const isStartOptions = u.isObjectOf({
  cmd: u.isOptionalOf(u.isArrayOf(u.isString)),
  cmdOptions: u.isOptionalOf(u.isRecordOf(u.isUnknown)),
  initializationOptions: u.isOptionalOf(u.isRecord),
  params: u.isOptionalOf(u.isRecord),
  rootPath: u.isOptionalOf(u.isString),
  rootUri: u.isOptionalOf(u.isString),
});

export type StartOptions = u.PredicateType<typeof isStartOptions>;

export type Client = {
  name: string;
  id: number;
  serverCapabilities: LSP.ServerCapabilities;
  getUriFromBufNr(bufnr: number): string;
  options: StartOptions;
};

export type Settings = {
  clientCapabilites: LSP.ClientCapabilities;
  startOptions: Record<string, StartOptions>;
  requestTimeout: number;
  tracePath?: string;
};

export type AttachCallback = (clientName: string) => Promisify<void>;

export type NotifyCallback = (
  clientName: string,
  params: unknown,
) => Promisify<void>;

export type RequestCallback = (
  clientName: string,
  params: unknown,
) => Promisify<unknown>;

export type CommandResult = unknown | Promise<unknown>;
export type Command = (...args: unknown[]) => CommandResult;

export interface Lspoints {
  readonly settings: PatchableObjectBox<Settings>;

  getClient(name: string): Client | undefined;

  getClients(bufNr: number): Client[];

  notify(
    name: string,
    method: string,
    params: ArrayOrObject,
  ): Promise<unknown>;

  request(
    name: string,
    method: string,
    params: ArrayOrObject,
  ): Promise<unknown>;

  subscribeAttach(callback: AttachCallback): void;

  subscribeNotify(
    method: string,
    callback: NotifyCallback,
  ): void;

  subscribeRequest(
    method: string,
    callback: RequestCallback,
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
