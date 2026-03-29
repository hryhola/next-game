export type Resulted<Result, Error = unknown> = [Result, undefined] | [undefined, Error]

export type GeneralFailure = {
    success: false
    message: string
}

export type GeneralSuccess = {
    success: true
}

export type R = GeneralFailure | GeneralSuccess

export type RecursivePartial<T> = {
    [P in keyof T]?: RecursivePartial<T[P]>
}
