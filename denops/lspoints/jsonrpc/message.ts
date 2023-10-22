import { u } from "../deps/unknownutil.ts";

export type ArrayOrObject = Array<unknown> | Record<string, unknown>;

export const isArrayOrObject: u.Predicate<ArrayOrObject> = u.isOneOf([
  u.isArray,
  u.isRecord,
]);

interface Message {
  jsonrpc: "2.0";
}

const isMessage: u.Predicate<Message> = u.isObjectOf({
  jsonrpc: (x: unknown): x is "2.0" => x === "2.0",
});

export interface NotifyMessage extends Message {
  method: string;
  params?: ArrayOrObject;
}

export const isNotifyMessage: u.Predicate<NotifyMessage> = u.isAllOf([
  isMessage,
  u.isObjectOf({
    method: u.isString,
    params: u.isOptionalOf(isArrayOrObject),
  }),
]);

export interface RequestMessage extends Message {
  id: number | string;
  method: string;
  params?: ArrayOrObject;
}

export const isRequestMessage: u.Predicate<RequestMessage> = u.isAllOf([
  isMessage,
  u.isObjectOf({
    id: u.isOneOf([
      u.isNumber,
      u.isString,
    ]),
    method: u.isString,
    params: u.isOptionalOf(isArrayOrObject),
  }),
]);

interface ResponseError {
  code: number;
  message: string;
  data?: string | number | boolean | ArrayOrObject | null;
}

const isResponseError: u.Predicate<ResponseError> = u.isObjectOf({
  code: u.isNumber,
  message: u.isString,
  data: u.isOptionalOf(u.isOneOf([
    u.isString,
    u.isNumber,
    u.isBoolean,
    isArrayOrObject,
    u.isNull,
  ])),
});

export interface ResponseMessage extends Message {
  id: number | string | null;
  result?: string | number | boolean | ArrayOrObject | null;
  error?: ResponseError;
}

export const isResponseMessage: u.Predicate<ResponseMessage> = u.isAllOf([
  isMessage,
  u.isObjectOf({
    id: u.isOneOf([
      u.isNumber,
      u.isString,
      u.isNull,
    ]),
    result: u.isOptionalOf(u.isOneOf([
      u.isString,
      u.isNumber,
      u.isBoolean,
      isArrayOrObject,
      u.isNull,
    ])),
    error: u.isOptionalOf(isResponseError),
  }),
]);
