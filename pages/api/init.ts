import { NextApiRequest, NextApiResponse } from 'next'
import { Server as NetServer, Socket } from 'net'
import { TemplatedApp } from 'uWebSockets.js'
import { createSocketServer } from 'uWebSockets/createSocketServer'
import logger from 'logger'

export type NextApiResponseUWS = NextApiResponse & {
    socket: Socket & {
        server: NetServer & {
            uws: TemplatedApp
        }
    }
}

const SocketHandler = (_req: NextApiRequest, res: NextApiResponseUWS) => {
    if (res.socket.server.uws) {
        logger.debug('Socket is already running')

        return res.end()
    }

    logger.info('Socket is initializing')

    const uws = createSocketServer()

    res.socket.server.uws = uws

    res.status(201)
    res.end()
}

export default SocketHandler
