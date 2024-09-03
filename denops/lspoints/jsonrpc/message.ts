import { as, is, type PredicateType } from "../deps/unknownutil.ts";

export const isArrayOrObject = is.UnionOf([
  is.Array,
  is.RecordOf(is.Any),
]);

export type ArrayOrObject = PredicateType<typeof isArrayOrObject>;

const isMessage = is.ObjectOf({
  jsonrpc: is.LiteralOf("2.0"),
});

export const isNotifyMessage = is.IntersectionOf([
  isMessage,
  is.ObjectOf({
    method: is.String,
    params: as.Optional(isArrayOrObject),
  }),
]);

export type NotifyMessage = PredicateType<typeof isNotifyMessage>;

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

export type RequestMessage = PredicateType<typeof isRequestMessage>;

const isResponseError = is.ObjectOf({
  code: is.Number,
  message: is.String,
  data: as.Optional(is.UnionOf([
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
    result: as.Optional(is.UnionOf([
      is.String,
      is.Number,
      is.Boolean,
      isArrayOrObject,
      is.Null,
    ])),
    error: as.Optional(isResponseError),
  }),
]);

export type ResponseMessage = PredicateType<typeof isResponseMessage>;
