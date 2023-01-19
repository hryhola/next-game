import uws from 'uWebSockets.js'

const readBody = (res: uws.HttpResponse): Promise<Buffer> =>
    new Promise((resolve, reject) => {
        let buffer: Buffer

        res.onData((ab, isLast) => {
            let chunk: Buffer = Buffer.from(ab)

            if (isLast) {
                if (buffer) {
                    return resolve(Buffer.concat([buffer, chunk]))
                } else {
                    return resolve(chunk)
                }
            } else {
                if (buffer) {
                    buffer = Buffer.concat([buffer, chunk])
                } else {
                    buffer = Buffer.concat([chunk])
                }
            }
        })

        res.onAborted(() => reject())
    })

export const readJSON = async <T>(res: uws.HttpResponse): Promise<T> => {
    const buffer = await readBody(res)
    const result = JSON.parse(buffer.toString()) as T

    return result
}
