export const URL = {
    get WS() {
        if (window.location.protocol.includes('https')) {
            return `wss://${location.host}/ws/`
        } else {
            return `ws://${location.hostname}:${process.env.NEXT_PUBLIC_WS_PORT}/ws`
        }
    }
}

export type EndpointInfo<Req = null, Res = null> = {
    request: Req
    response: Res
}

export type Endpoints = {
    // @index('../../pages/api/*.ts', f => `'${f.name}': EndpointInfo<import('pages/api/${f.name}').Request, import('pages/api/${f.name}').Response>`)
    'game-get-schema': EndpointInfo<import('pages/api/game-get-schema').Request, import('pages/api/game-get-schema').Response>
    hello: EndpointInfo<import('pages/api/hello').Request, import('pages/api/hello').Response>
    'lobby-create': EndpointInfo<import('pages/api/lobby-create').Request, import('pages/api/lobby-create').Response>
    'lobby-data': EndpointInfo<import('pages/api/lobby-data').Request, import('pages/api/lobby-data').Response>
    'lobby-destroy': EndpointInfo<import('pages/api/lobby-destroy').Request, import('pages/api/lobby-destroy').Response>
    'lobby-join': EndpointInfo<import('pages/api/lobby-join').Request, import('pages/api/lobby-join').Response>
    'lobby-leave': EndpointInfo<import('pages/api/lobby-leave').Request, import('pages/api/lobby-leave').Response>
    profile: EndpointInfo<import('pages/api/profile').Request, import('pages/api/profile').Response>
    // @endindex
}

export type EndpointName = keyof Endpoints
