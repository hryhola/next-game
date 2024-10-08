import { Resulted } from 'util/universalTypes'
import { EndpointName, Endpoints } from './url'

const createHandler = (method: string) => {
    return async function <E extends EndpointName>(endpoint: E, data: Endpoints[E]['request']): Promise<Resulted<Endpoints[E]['response']>> {
        const req: RequestInit = {
            method
        }

        if (data) {
            req.body = typeof data === 'string' || data instanceof FormData ? data : JSON.stringify(data)
        }

        var url = `${location.origin}/api/${endpoint}`

        try {
            const response = await fetch(url, req)
            const data = await response.json()

            return [data as Endpoints[E]['response'], undefined]
        } catch (e) {
            return [undefined, e]
        }
    }
}

export const api = {
    post: createHandler('POST')
}
