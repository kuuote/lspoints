import { is, u } from "../deps/unknownutil.ts";

export const isArrayOrObject = is.UnionOf([
  is.Array,
  is.Record,
]);

export type ArrayOrObject = u.PredicateType<typeof isArrayOrObject>;

const isMessage = is.ObjectOf({
  jsonrpc: is.LiteralOf("2.0"),
});

export const isNotifyMessage = is.IntersectionOf([
  isMessage,
  is.ObjectOf({
    method: is.String,
    params: is.OptionalOf(isArrayOrObject),
  }),
]);

export type NotifyMessage = u.PredicateType<typeof isNotifyMessage>;

const isID = is.UnionOf([
  is.Number,
  is.String,
]);

export const isRequestMessage = is.IntersectionOf([
  isNotifyMessage,
  is.ObjectOf({
    id: isID,
  }),
]);

export type RequestMessage = u.PredicateType<typeof isRequestMessage>;

const isResponseError = is.ObjectOf({
  code: is.Number,
  message: is.String,
  data: is.OptionalOf(is.UnionOf([
    is.String,
    is.Number,
    is.Boolean,
    isArrayOrObject,
    is.Null,
  ])),
});

export const isResponseMessage = is.IntersectionOf([
  isMessage,
  is.ObjectOf({
    id: isID,
    result: is.OptionalOf(is.UnionOf([
      is.String,
      is.Number,
      is.Boolean,
      isArrayOrObject,
      is.Null,
    ])),
    error: is.OptionalOf(isResponseError),
  }),
]);

export type ResponseMessage = u.PredicateType<typeof isResponseMessage>;
