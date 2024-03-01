import { PatchableObjectBox } from "./box.ts";
import { Denops } from "./deps/denops.ts";
import { LSP } from "./deps/lsp.ts";
import { is, u } from "./deps/unknownutil.ts";
import { ArrayOrObject } from "./jsonrpc/message.ts";

type Promisify<T> = T | Promise<T>;

export const isStartOptions = is.ObjectOf({
  cmd: is.OptionalOf(is.ArrayOf(is.String)),
  cmdOptions: is.OptionalOf(is.RecordOf(is.Unknown)),
  initializationOptions: is.OptionalOf(is.Record),
  params: is.OptionalOf(is.Record),
  rootPath: is.OptionalOf(is.String),
  rootUri: is.OptionalOf(is.String),
});

export type StartOptions = u.PredicateType<typeof isStartOptions>;

export type Client = {
  name: string;
  id: number;
  serverCapabilities: LSP.ServerCapabilities;
  getUriFromBufNr(bufnr: number): string;
  getDocumentVersion(bufnr: number): number;
  isAttached(bufnr: number): boolean;
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
