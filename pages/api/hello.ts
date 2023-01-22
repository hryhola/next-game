// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'

type Data = {
    name: string
}

export default function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
    // @ts-ignore
    console.log(JSON.stringify(res.socket.server.appState))

    // @ts-ignore
    res.status(200).end() // .json(res.appState)
}
