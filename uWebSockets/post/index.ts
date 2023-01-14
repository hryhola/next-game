import logger from 'logger'
import uws from 'uWebSockets.js'

// @index('./**/*.ts', f => `import { handler as ${f.path.replaceAll('-', '').replaceAll('/', '').substring(1)} } from '${f.path}'`)
import { handler as lobbycreatejeopardy } from './lobby-create/jeopardy'
// @endindex

const handlers: Record<string, (res: uws.HttpResponse, req: uws.HttpRequest) => void> = {
    // @index('./**/*.ts', f => `'${f.path.substring(2)}': ${f.path.replaceAll('-', '').replaceAll('/', '').substring(1)},`)
    'lobby-create/jeopardy': lobbycreatejeopardy
    // @endindex
}

const PostHandler = (app: uws.TemplatedApp) => {
    Object.keys(handlers).forEach(route => {
        const url = '/wsapi/' + route

        logger.debug('Registered POST route: ' + url)

        app.post(url, handlers[route])
    })
}

export default PostHandler
