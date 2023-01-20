import uws from 'uWebSockets.js'

import { state } from 'state'

const multipart = require('parse-multipart-data')

export const handler = async (res: uws.HttpResponse, req: uws.HttpRequest) => {
    console.log('Posted to ' + req.getUrl())

    console.log(state.users)

    res.writeHeader('Content-Type', 'application/json')

    return res.end(
        JSON.stringify({
            success: false
        })
    )

    // const contentType = req.getHeader('content-type')

    // if (!contentType.includes('multipart/form-data') || !contentType.includes('boundary=')) {
    //     res.writeStatus('400 Bad Request')
    //     res.end(
    //         JSON.stringify({
    //             success: false,
    //             message: 'Incorrect content type'
    //         })
    //     )
    // }

    // const [, boundary] = contentType.split('boundary=')

    // const buffer = await readBody(res)

    // const parts = multipart.parse(buffer, boundary)

    // console.log(parts)

    // return res.end(
    //     JSON.stringify({
    //         success: true,
    //         lobby: ''
    //     })
    // )
}
