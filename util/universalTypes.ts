import { Server as NetServer, Socket } from 'net'
import { NextApiResponse } from 'next'
import { State } from 'state'
import { TemplatedApp } from 'uWebSockets.js'

export type Resulted<Result, Error = unknown> = [Result, undefined] | [undefined, Error]

export type NextApiResponseUWS<T = any> = NextApiResponse<T> & {
    socket: Socket & {
        server: NetServer & {
            uws: TemplatedApp
            appState: State
        }
    }
}

export type GeneralFailure = {
    success: false
    message: string
}

export type GeneralSuccess = {
    success: true
}

export type R = GeneralFailure | GeneralSuccess
