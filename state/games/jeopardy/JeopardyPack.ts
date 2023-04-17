import path from 'path'
import { v4 } from 'uuid'
import { unzip } from 'util/zip'

export class JeopardyPack {
    sourceFile: string
    packFolder: string

    isParsed = false

    constructor(sourceRes: string) {
        const publicFolder = process.env.NODE_ENV === 'production' ? '/var/www/game-club.click/html' : process.cwd() + '/public'

        this.sourceFile = path.join(publicFolder, sourceRes)

        this.packFolder = path.join(publicFolder, 'res', 'jeopardy', v4() + '-' + path.parse(sourceRes).name)
    }

    async parse() {
        await unzip(this.sourceFile, this.packFolder)

        this.isParsed = true
    }
}
