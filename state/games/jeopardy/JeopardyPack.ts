import path from 'path'
import fs from 'fs'
import os from 'os'
import JSZip from 'jszip'
import xml2js from 'xml-js'
import { JeopardyDeclaration } from './JeopardyPack.types'
import ffprobe from 'ffprobe-static'
import ffmpeg from 'fluent-ffmpeg'
import { arrayed } from 'util/array'

function getMediaFileDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
        // Use fluent-ffmpeg to extract the duration from the file
        ffmpeg(filePath)
            .setFfprobePath(ffprobe.path)
            .ffprobe(0, (err, metadata) => {
                if (err) {
                    reject(err)
                    return
                }

                // Extract the duration from the metadata
                const duration = metadata.format.duration as number

                resolve(duration)
            })
    })
}

export class JeopardyPack {
    static getJeopardyMetadata = async (archivePath: string): Promise<any> => {
        const data: Buffer = await fs.promises.readFile(archivePath)
        const zip = await new JSZip().loadAsync(data)

        const mediaDurationMap: Record<string, number> = {}

        let declaration: JeopardyDeclaration.Pack | undefined

        await Promise.all(
            Object.entries(zip.files).map(async ([relativePath, file]) => {
                if (relativePath === 'content.xml') {
                    const contentXml: string = await zip.files[relativePath].async('text')

                    declaration = xml2js.xml2js(contentXml, { compact: true }) as JeopardyDeclaration.Pack

                    return Promise.resolve(null)
                }

                // Check if the file is an audio or video file
                if (file.name.match(/\.(mp3|wav|mp4|mov|avi)$/i)) {
                    // Extract the file content as a Buffer
                    const fileData = await file.async('nodebuffer')

                    // Create a temporary file path by replacing slashes with underscores
                    const tempFileName = decodeURI(file.name).replace(/[\/\\]/g, '_')
                    const tempFilePath = path.join(os.tmpdir(), `${tempFileName}_${Date.now()}`)

                    // Write the file content to the temporary file
                    fs.writeFileSync(tempFilePath, fileData)

                    try {
                        // Get the duration of the file
                        const duration = await getMediaFileDuration(tempFilePath)

                        // Save the duration or perform any other desired action
                        mediaDurationMap[decodeURI(file.name)] = duration
                    } catch (error) {
                        console.error(`Error getting duration for file ${file.name}:`, error)
                    } finally {
                        // Remove the temporary file
                        fs.unlinkSync(tempFilePath)
                    }
                }

                return Promise.resolve(null)
            })
        )

        if (!declaration) {
            throw new Error("Can't get Jeopardy declaration!")
        }

        return { mediaDurationMap, declaration }
    }

    sourceFile: string
    declaration!: JeopardyDeclaration.Pack
    mediaDurationMap!: Record<string, number> // Duration in seconds

    constructor(sourceRes: string) {
        const publicFolder = process.env.NODE_ENV === 'production' ? '/var/www/game-club.click/html' : process.cwd() + '/public'

        this.sourceFile = path.join(publicFolder, sourceRes)
    }

    async parse() {
        const { declaration, mediaDurationMap } = await JeopardyPack.getJeopardyMetadata(this.sourceFile)

        this.declaration = declaration
        this.mediaDurationMap = mediaDurationMap
    }

    getAllThemes() {
        const rounds = arrayed(this.declaration.package.rounds.round)

        return rounds.reduce((acc, round) => [...acc, ...arrayed(round.themes.theme).map(t => t._attributes.name)], [] as string[])
    }

    getNonFinalThemes() {
        return arrayed(this.declaration.package.rounds.round).reduce(
            (acc, round) => (round._attributes.type === 'final' ? acc : [...acc, ...arrayed(round.themes.theme).map(t => t._attributes.name)]),
            [] as string[]
        )
    }

    isFinalRound(roundId: number) {
        return arrayed(this.declaration.package.rounds.round)[roundId]?._attributes.type === 'final'
    }

    getFinalThemes() {
        return arrayed(this.declaration.package.rounds.round).reduce(
            (acc, round) => (round._attributes.type !== 'final' ? acc : [...acc, ...arrayed(round.themes.theme).map(t => t._attributes.name)]),
            [] as string[]
        )
    }

    getRoundThemeNames(roundId: number) {
        const round = arrayed(this.declaration.package.rounds.round)[roundId]

        if (!round) {
            return null
        }

        return {
            roundName: round._attributes.name,
            isFinalRound: round._attributes.type === 'final',
            themeNames: arrayed(round.themes.theme).map(t => t._attributes.name)
        }
    }

    getRoundThemesCount(roundId: number) {
        const round = arrayed(this.declaration.package.rounds.round)[roundId]

        if (!round) {
            return null
        }

        return arrayed(round.themes.theme).length
    }

    getRoundsCount() {
        return arrayed(this.declaration.package.rounds.round).length
    }

    getRoundQuestions(roundId: number) {
        const round = arrayed(this.declaration.package.rounds.round)[roundId]

        if (!round) {
            return null
        }

        return arrayed(round.themes.theme).reduce(
            (questions, theme, themeIndex) => [
                ...questions,
                ...arrayed(theme.questions.question).map((_, questionIndex) => `${roundId}-${themeIndex}-${questionIndex}`)
            ],
            [] as string[]
        )
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
        const round = arrayed(this.declaration.package.rounds.round)[roundId]

        if (!round) {
            return null
        }

        return arrayed(round.themes.theme).map((theme, tIndex) => ({
            name: theme._attributes.name,
            themeId: `${roundId}-${tIndex}`,
            question: arrayed(theme.questions.question).map((question, qIndex) => ({
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

        return arrayed(arrayed(arrayed(this.declaration.package.rounds.round)[+roundId]?.themes.theme)[+themeId]?.questions.question)[+questionId]
    }

    getQuestionScenarioById(
        id: `${number}-${number}-${number}`
    ): null | [JeopardyDeclaration.QuestionScenarioContentAtom[], JeopardyDeclaration.QuestionScenarioContentAtom[]] {
        const question = this.getQuestionById(id)

        if (!question) {
            return null
        }

        if (!Array.isArray(question.scenario.atom)) {
            return [[question.scenario.atom as JeopardyDeclaration.QuestionScenarioContentAtom], []]
        }

        const nonEmptyAtoms = question.scenario.atom.filter(a => Object.keys(a).length)

        const beforeMarker: JeopardyDeclaration.QuestionScenarioContentAtom[] = []
        const afterMarker: JeopardyDeclaration.QuestionScenarioContentAtom[] = []

        let hadPassMarker = false

        for (let i = 0; i < nonEmptyAtoms.length; i++) {
            const atom = nonEmptyAtoms[i]

            if (atom._attributes?.type === 'marker') {
                hadPassMarker = true
                continue
            }

            if (hadPassMarker) {
                afterMarker.push(atom as JeopardyDeclaration.QuestionScenarioContentAtom)
            } else {
                beforeMarker.push(atom as JeopardyDeclaration.QuestionScenarioContentAtom)
            }
        }

        return [beforeMarker, afterMarker]
    }

    getAnswers(questionId: `${number}-${number}-${number}`): [string[], string[]] | null {
        const question = this.getQuestionById(questionId)

        if (!question) {
            return null
        }

        if (!question.right.answer) {
            return [[], []]
        }

        const correct: string[] = arrayed(question.right.answer).map(a => a._text)

        if (!question.wrong) {
            return [correct, []]
        }

        const incorrect: string[] = arrayed(question.wrong.answer).map(a => a._text)

        return [correct, incorrect]
    }
}
