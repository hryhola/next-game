import path from 'path'
import fs from 'fs'
import JSZip from 'jszip'
import xml2js from 'xml-js'
import { findFileInJSZip } from 'util/zip'
import logger from 'logger'
import { JeopardyDeclaration } from './JeopardyPack.types'

export class JeopardyPack {
    static getJeopardyDeclaration = async (archivePath: string): Promise<any> => {
        const data: Buffer = await fs.promises.readFile(archivePath)
        const zip = new JSZip()
        const contents = await zip.loadAsync(data)
        const contentXmlEntry = findFileInJSZip(contents, 'content.xml')

        if (!contentXmlEntry) {
            throw new Error('content.xml not found in the zip file')
        }

        const contentXml: string = await contents.files[contentXmlEntry].async('text')
        const contentJs = xml2js.xml2js(contentXml, { compact: true }) as JeopardyDeclaration.Pack

        return contentJs
    }

    sourceFile: string
    declaration!: JeopardyDeclaration.Pack

    constructor(sourceRes: string) {
        const publicFolder = process.env.NODE_ENV === 'production' ? '/var/www/game-club.click/html' : process.cwd() + '/public'

        this.sourceFile = path.join(publicFolder, sourceRes)
    }

    async parse() {
        try {
            this.declaration = await JeopardyPack.getJeopardyDeclaration(this.sourceFile)
        } catch (error) {
            logger.error({ error }, 'JeopardyPack.parse()')
        }
    }

    getAllThemes() {
        return this.declaration.package.rounds.round.reduce((acc, round) => [...acc, ...round.themes.theme.map(t => t._attributes.name)], [] as string[])
    }

    getNonFinalThemes() {
        return this.declaration.package.rounds.round.reduce(
            (acc, round) => (round._attributes.type === 'final' ? acc : [...acc, ...round.themes.theme.map(t => t._attributes.name)]),
            [] as string[]
        )
    }

    getRoundThemeNames(roundId: number) {
        const round = this.declaration.package.rounds.round[roundId]

        if (!round) {
            return null
        }

        return {
            roundName: round._attributes.name,
            isFinalRound: round._attributes.type === 'final',
            themeNames: round.themes.theme.map(t => t._attributes.name)
        }
    }

    getRoundQuestionViewData(roundId: number):
        | {
              name: string
              themeId: `${number}-${number}` // round index + theme index
              question: {
                  questionId: `${number}-${number}-${number}` // round index + theme index + question index
                  price: string
              }[]
          }[]
        | null {
        const round = this.declaration.package.rounds.round[roundId]

        if (!round) {
            return null
        }

        return round.themes.theme.map((theme, tIndex) => ({
            name: theme._attributes.name,
            themeId: `${roundId}-${tIndex}`,
            question: theme.questions.question.map((question, qIndex) => ({
                price: question._attributes.price,
                questionId: `${roundId}-${tIndex}-${qIndex}`
            }))
        }))
    }

    getQuestionById(id: `${number}-${number}-${number}`) {
        const [roundId, themeId, questionId] = id.split('-')

        if (!roundId || !themeId || !questionId) {
            return null
        }

        return this.declaration.package.rounds.round[+roundId]?.themes.theme[+themeId]?.questions.question[+questionId]
    }
}
