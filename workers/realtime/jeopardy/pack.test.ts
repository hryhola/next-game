import fs from 'fs'
import path from 'path'
import { getNormalizedQuestionById, parseJeopardyPackArchive } from './pack'

const cwd = process.cwd()

async function readPack(relativePath: string) {
    const filePath = path.join(cwd, relativePath)
    const buffer = fs.readFileSync(filePath)

    return parseJeopardyPackArchive(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
}

describe('jeopardy pack parser', () => {
    it('parses the root legacy packs end-to-end', async () => {
        const rootPacks = ['УберПак1.siq', 'Музыкальный пак [Easy] by d9j.siq']

        for (const packPath of rootPacks) {
            const parsedPack = await readPack(packPath)

            expect(parsedPack.packName).toBeTruthy()
            expect(parsedPack.author).toBeTruthy()

            const normalizedQuestions: ReturnType<typeof getNormalizedQuestionById>[] = []

            for (let roundIndex = 0; ; roundIndex += 1) {
                let didFindRoundQuestion = false

                for (let themeIndex = 0; ; themeIndex += 1) {
                    let didFindThemeQuestion = false

                    for (let questionIndex = 0; ; questionIndex += 1) {
                        const questionId = `${roundIndex}-${themeIndex}-${questionIndex}` as const
                        const question = getNormalizedQuestionById(parsedPack.declaration, questionId)

                        if (!question) {
                            break
                        }

                        didFindRoundQuestion = true
                        didFindThemeQuestion = true
                        normalizedQuestions.push(question)
                    }

                    if (!didFindThemeQuestion) {
                        break
                    }
                }

                if (!didFindRoundQuestion) {
                    break
                }
            }

            expect(normalizedQuestions.length).toBeGreaterThan(0)
            expect(
                normalizedQuestions.every(
                    question => question.questionItems.length > 0 || question.answerItems.length > 0 || question.correctAnswers.length > 0
                )
            ).toBe(true)
        }
    })

    it('normalizes legacy SI aliases from the reference simulator pack', async () => {
        const parsedPack = await readPack('SI/test/SImulator/SImulator.ViewModel.Tests/Resources/1.siq')

        expect(getNormalizedQuestionById(parsedPack.declaration, '0-1-2')?.type).toBe('noRisk')
        expect(getNormalizedQuestionById(parsedPack.declaration, '0-4-3')?.type).toBe('secret')
        expect(getNormalizedQuestionById(parsedPack.declaration, '0-4-3')?.selectionMode).toBe('any')
        expect(getNormalizedQuestionById(parsedPack.declaration, '0-4-3')?.priceOptions).toEqual([700])
        expect(getNormalizedQuestionById(parsedPack.declaration, '0-4-4')?.type).toBe('stake')
    })

    it('reads params-based content items, timers, and price sets from the SI reference pack', async () => {
        const parsedPack = await readPack('SI/test/SIGame/SIGame.Tests/SIGameTestNew.siq')

        const secretQuestion = getNormalizedQuestionById(parsedPack.declaration, '0-0-4')
        const replicQuestion = getNormalizedQuestionById(parsedPack.declaration, '0-1-1')

        expect(secretQuestion?.type).toBe('secret')
        expect(secretQuestion?.priceOptions).toEqual([100, 300, 500, 700, 900])
        expect(replicQuestion?.questionItems[0]).toMatchObject({
            content: 'Это устный текст. Он появится в игре как реплика ведущего',
            placement: 'replic',
            type: 'text'
        })
        expect(replicQuestion?.questionItems[1]?.durationMs).toBe(8000)
    })
})
