import type { PatchableObjectBox } from "./box.ts";
import type { Denops } from "./deps/denops.ts";
import type { LSP } from "./deps/lsp.ts";
import { as, is, type Predicate } from "./deps/unknownutil.ts";

type Promisify<T> = T | Promise<T>;

type ArrayOrObject = Array<unknown> | Record<string, unknown>;

export type StartOptions = {
  cmd?: string[];
  cmdOptions?: Record<string, unknown>;
  initializationOptions?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  params?: Record<string, unknown>;
  rootPath?: string;
  rootUri?: string;
};

export const isStartOptions: Predicate<StartOptions> = is.ObjectOf({
  cmd: as.Optional(is.ArrayOf(is.String)),
  cmdOptions: as.Optional(is.RecordOf(is.Unknown)),
  initializationOptions: as.Optional(is.Record),
  settings: as.Optional(is.Record),
  params: as.Optional(is.Record),
  rootPath: as.Optional(is.String),
  rootUri: as.Optional(is.String),
});

export type Client = {
  name: string;
  id: number;
  notify: (method: string, params?: ArrayOrObject) => Promise<void>;
  request: (
    method: string,
    params?: ArrayOrObject,
    options?: { signal: AbortSignal },
  ) => Promise<unknown>;
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
