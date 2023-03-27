export const URL = {
    get WS() {
        if (window.location.protocol.includes('https')) {
            return `wss://${location.host}/ws/`
        } else {
            return `ws://${location.hostname}:${process.env.NEXT_PUBLIC_WS_PORT}/ws`
        }
    }
}

export type EndpointInfo<Url extends string, Req = null, Res = null> = {
    relativeUrl: Url
    request: Req
    response: Res
}

export type Endpoints = {
    // @index('../../pages/api/*.ts', f => `'${f.name}': EndpointInfo<'pages/api/${f.name}', import('pages/api/${f.name}').Request, import('pages/api/${f.name}').Response>`)
    hello: EndpointInfo<'pages/api/hello', import('pages/api/hello').Request, import('pages/api/hello').Response>
    'lobby-create': EndpointInfo<'pages/api/lobby-create', import('pages/api/lobby-create').Request, import('pages/api/lobby-create').Response>
    'lobby-data': EndpointInfo<'pages/api/lobby-data', import('pages/api/lobby-data').Request, import('pages/api/lobby-data').Response>
    'lobby-destroy': EndpointInfo<'pages/api/lobby-destroy', import('pages/api/lobby-destroy').Request, import('pages/api/lobby-destroy').Response>
    'lobby-join': EndpointInfo<'pages/api/lobby-join', import('pages/api/lobby-join').Request, import('pages/api/lobby-join').Response>
    'lobby-leave': EndpointInfo<'pages/api/lobby-leave', import('pages/api/lobby-leave').Request, import('pages/api/lobby-leave').Response>
    profile: EndpointInfo<'pages/api/profile', import('pages/api/profile').Request, import('pages/api/profile').Response>
    // @endindex
}

export type EndpointName = keyof Endpoints
