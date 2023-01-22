import { Server as NetServer, Socket } from 'net'
import { NextApiResponse } from 'next'
import { State } from 'state'
import { TemplatedApp } from 'uWebSockets.js'

export type X<Result, Error = unknown> = [Result, undefined] | [undefined, Error]

export type NextApiResponseUWS<T = any> = NextApiResponse<T> & {
    socket: Socket & {
        server: NetServer & {
            uws: TemplatedApp
            appState: State
        }
    }
}
