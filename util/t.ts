export type X<Result, Error = unknown> = [Result, undefined] | [undefined, Error]
