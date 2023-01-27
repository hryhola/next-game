import { NextApiRequest } from 'next'
import { createSocketServer } from 'uWebSockets/createSocketServer'
import logger from 'logger'
import { NextApiResponseUWS } from 'util/t'

export const createUWS = (res: NextApiResponseUWS) => {
    if (res.socket.server.uws) {
        logger.debug('Socket is already running')

        return
    }

    logger.info('Socket is initializing')

    const [uws, state] = createSocketServer()

    res.socket.server.uws = uws
    res.socket.server.appState = state
}

const SocketHandler = (_req: NextApiRequest, res: NextApiResponseUWS) => {
    createUWS(res)

    res.end()
}

export default SocketHandler
