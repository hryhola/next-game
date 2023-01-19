const createHandler = (method: string) => {
    return async function <R>(url: string, data?: FormData | string | Object): Promise<X<R>> {
        const headers = new Headers()

        headers.set('authorization', localStorage.getItem('token')!)

        const req: RequestInit = {
            method,
            headers
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

export const api = {
    post: createHandler('POST')
}
