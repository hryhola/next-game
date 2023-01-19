import logger from 'logger'
import uws from 'uWebSockets.js'
import { Handler } from 'uWebSockets/uws.types'

// @index('./**/*.ts', f => `import { handler as ${f.path.replaceAll('-', '').replaceAll('/', '').substring(1)} } from '${f.path}'`)
import { handler as auth } from './auth'
import { handler as lobbycreatejeopardy } from './lobby-create/jeopardy'
import { handler as profile } from './profile'
// @endindex

const handlers = {
    // @index('./**/*.ts', f => `'${f.path.substring(2)}': ${f.path.replaceAll('-', '').replaceAll('/', '').substring(1)},`)
    auth: auth,
    'lobby-create/jeopardy': lobbycreatejeopardy,
    profile: profile
    // @endindex
}

type PostRoute = keyof typeof handlers

const getUrl = (route: string) => `${process.env.NODE_ENV === 'production' ? 'https' : 'http'}://localhost:${process.env.NEXT_PUBLIC_WS_PORT}/wsapi/${route}`

export const WsUrl = Object.keys(handlers).reduce((acc, curr) => {
    acc[curr as PostRoute] = getUrl(curr)

    return acc
}, {} as Record<PostRoute, string>)

const PostHandler = (app: uws.TemplatedApp) => {
    logger.debug('Registered POST connection type')

    Object.keys(handlers).forEach(route => {
        const url = '/wsapi/' + route

        logger.debug('Registered POST route: ' + url)

        app.post(url, handlers[route as PostRoute])
    })
}

export default PostHandler
