import logger from 'logger'
import { State } from 'state'
import uws from 'uWebSockets.js'
import { createHandlerWrapper } from 'uWebSockets/utils/rest/handler-wrapper'
import { HTTPMethod } from 'uWebSockets/uws.types'

// @index('./**/*.ts', f => `import { handlers as ${f.path.replaceAll('-', '').replaceAll('/', '').substring(1)} } from '${f.path}'`)
import { handlers as auth } from './auth'
import { handlers as lobby } from './lobby'
import { handlers as profile } from './profile'
// @endindex

const routeHandlers = {
    // @index('./**/*.ts', f => `'${f.path.substring(2)}': ${f.path.replaceAll('-', '').replaceAll('/', '').substring(1)},`)
    auth: auth,
    lobby: lobby,
    profile: profile
    // @endindex
}

type uWSRestRoute = keyof typeof routeHandlers

const getUrl = (route: string) => `${process.env.NODE_ENV === 'production' ? 'https' : 'http'}://localhost:${process.env.NEXT_PUBLIC_WS_PORT}/wsapi/${route}`

export const uWSRest = Object.keys(routeHandlers).reduce((acc, curr) => {
    acc[curr as uWSRestRoute] = getUrl(curr)

    return acc
}, {} as Record<uWSRestRoute, string>)

export const RestHandlersRegister = (app: uws.TemplatedApp, state: State) => {
    Object.keys(routeHandlers).forEach(route => {
        const url = '/wsapi/' + route

        const restHandlers = routeHandlers[route as uWSRestRoute]

        Object.entries(restHandlers).forEach(([method, handler]) => {
            try {
                app[method as HTTPMethod](url, createHandlerWrapper(handler, state, route, method))
                logger.debug(`Registered ${method.toUpperCase()}\t${url}`)
            } catch (e) {
                logger.error({ error: e }, `Cannot register ${method.toUpperCase()} ${url}`)
            }
        })
    })
}
