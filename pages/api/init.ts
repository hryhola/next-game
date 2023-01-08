import { NextApiRequest, NextApiResponse } from 'next'
import { Server as NetServer, Socket } from 'net'
import { TemplatedApp } from 'uWebSockets.js'
import { createSocketApp, WS_PORT } from 'uws/WSCreator'

export type NextApiResponseUWS = NextApiResponse & {
    socket: Socket & {
        server: NetServer & {
            uws: TemplatedApp
        }
    }
}

const SocketHandler = (_req: NextApiRequest, res: NextApiResponseUWS) => {
    if (res.socket.server.uws) {
        console.log('Socket is already running')

        return res.json({ port: WS_PORT })
    }

    console.log('Socket is initializing')

    const uws = createSocketApp()

    res.socket.server.uws = uws

    res.json({ port: WS_PORT })
}

export default SocketHandler
