import type { NextApiRequest } from 'next'
import { join } from 'path'
import formidable from 'formidable'
import { mkdir, stat } from 'fs/promises'
import { v4 } from 'uuid'
import { Resulted } from 'util/universalTypes'
import logger from 'logger'

type PraseFromResult = { fields: formidable.Fields; files: formidable.Files }

export const parseForm = async (req: NextApiRequest, folder?: string): Promise<Resulted<PraseFromResult>> => {
    return new Promise(async (resolve, reject) => {
        let uploadDir = process.env.NODE_ENV === 'production' ? '/var/www/game-club.click/html' : process.cwd() + '/public'

        uploadDir += '/res'

        if (folder) {
            uploadDir += '/' + folder + '/'
        }

        logger.info('Uploading files to' + uploadDir)

        try {
            await stat(uploadDir)
        } catch (e: any) {
            if (e.code === 'ENOENT') {
                await mkdir(uploadDir, { recursive: true })
            } else {
                console.error(e)
                reject(e)
                return
            }
        }

        const form = formidable({
            maxFiles: 1,
            maxFileSize: 1024 * 1024 * 200, // 200mb
            uploadDir,
            filename: (_name, _ext, part) => {
                const filename = `${v4()}-${part.originalFilename}`

                return filename
            }
        })

        form.parse(req, function (err, fields, files) {
            if (err) resolve([undefined, err])
            else resolve([{ fields, files }, undefined])
        })
    })
}
