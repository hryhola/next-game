import { NextApiRequest } from 'next'
import { createSocketServer } from 'uWebSockets/createSocketServer'
import logger from 'logger'
import { NextApiResponseUWS } from 'util/t'

const SocketHandler = (_req: NextApiRequest, res: NextApiResponseUWS) => {
    if (res.socket.server.uws) {
        logger.debug('Socket is already running')

        return res.end()
    }

    logger.info('Socket is initializing')

    const [uws, state] = createSocketServer()

    res.socket.server.uws = uws
    res.socket.server.appState = state

    res.status(201)
    res.end()
}

export default SocketHandler
