import { X } from 'util/t'

const createHandler = (method: string) => {
    return async function <R>(url: string, data?: FormData | string | Object): Promise<X<R>> {
        const req: RequestInit = {
            method
        }

        if (data) {
            req.body = typeof data === 'string' || data instanceof FormData ? data : JSON.stringify(data)
        }

        try {
            const response = await fetch(url, req)
            const data = await response.json()

            return [data as R, undefined]
        } catch (e) {
            return [undefined, e]
        }
    }
}

type WSEventContext = {
    scope?: string
    lobbyId?: string
}

export const isCurrentContext = (response: WSEventContext, current: WSEventContext) => {
    if (response.scope === 'global') {
        return current.scope === 'global'
    } else {
        return response.scope === current.scope && response.lobbyId === current.lobbyId
    }
}

export const api = {
    post: createHandler('POST')
}
