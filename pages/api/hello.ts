// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'

export type Request = {
    name: string
}

export type Response = undefined

export default function handler(req: NextApiRequest, res: NextApiResponse<Request>) {
    console.log('hi')

    res.status(200).end()
}
