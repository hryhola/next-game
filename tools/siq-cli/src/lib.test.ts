import fs from 'fs'
import os from 'os'
import path from 'path'
import JSZip from 'jszip'
import { getNormalizedQuestionById, isFinalRound, parseJeopardyPackArchive, validateJeopardyPackCompatibility } from '../../../workers/realtime/jeopardy/pack'
import { buildPackFromDirectory, createBoilerplatePack } from './lib'

async function makeTempDir() {
    return fs.promises.mkdtemp(path.join(os.tmpdir(), 'siq-cli-'))
}

describe('siq cli library', () => {
    it('creates the expected boilerplate structure for a full pack', async () => {
        const tempDir = await makeTempDir()
        const targetDir = path.join(tempDir, 'my_pack')

        await createBoilerplatePack({
            targetDir
        })

        expect(fs.existsSync(path.join(targetDir, 'pack.json'))).toBe(true)
        expect(fs.existsSync(path.join(targetDir, 'Раунд 1', 'Тема 1', '100', 'type.txt'))).toBe(true)
        expect(fs.existsSync(path.join(targetDir, 'Раунд 2', 'Тема 5', '500', 'accepted.txt'))).toBe(true)
        expect(fs.readFileSync(path.join(targetDir, 'Фінальний раунд', 'Тема 3', '1', 'type.txt'), 'utf8')).toBe('stakeAll\n')
    })

    it('builds a playable .siq pack from the folder structure and preserves atom ordering and media types', async () => {
        const tempDir = await makeTempDir()
        const sourceDir = path.join(tempDir, 'pack')
        const outputFile = path.join(tempDir, 'pack.siq')

        await fs.promises.mkdir(path.join(sourceDir, 'Раунд 1', 'Тема 1', '100'), { recursive: true })
        await fs.promises.mkdir(path.join(sourceDir, 'Фінальний раунд', 'Тема фінал', '1'), { recursive: true })
        await fs.promises.writeFile(
            path.join(sourceDir, 'pack.json'),
            JSON.stringify(
                {
                    author: 'CLI Test',
                    difficulty: '2',
                    name: 'CLI Pack'
                },
                null,
                2
            )
        )

        await fs.promises.writeFile(path.join(sourceDir, 'Раунд 1', 'Тема 1', '100', 'type.txt'), 'simple\n')
        await fs.promises.writeFile(path.join(sourceDir, 'Раунд 1', 'Тема 1', '100', '1.txt'), 'Question text\n')
        await fs.promises.writeFile(path.join(sourceDir, 'Раунд 1', 'Тема 1', '100', '2.jpg'), 'fake-image-data')
        await fs.promises.writeFile(path.join(sourceDir, 'Раунд 1', 'Тема 1', '100', 'answer.txt'), 'Answer reveal\n')
        await fs.promises.writeFile(path.join(sourceDir, 'Раунд 1', 'Тема 1', '100', 'answer2.html'), '<b>Answer html</b>\n')
        await fs.promises.writeFile(path.join(sourceDir, 'Раунд 1', 'Тема 1', '100', 'accepted.txt'), 'Correct 1\nCorrect 2\n')
        await fs.promises.writeFile(path.join(sourceDir, 'Раунд 1', 'Тема 1', '100', 'wrong.txt'), 'Wrong 1\n')

        await fs.promises.writeFile(path.join(sourceDir, 'Фінальний раунд', 'Тема фінал', '1', 'type.txt'), 'stakeAll\n')
        await fs.promises.writeFile(path.join(sourceDir, 'Фінальний раунд', 'Тема фінал', '1', '1.mp3'), 'fake-audio-data')
        await fs.promises.writeFile(path.join(sourceDir, 'Фінальний раунд', 'Тема фінал', '1', 'answer.txt'), 'Final answer reveal\n')
        await fs.promises.writeFile(path.join(sourceDir, 'Фінальний раунд', 'Тема фінал', '1', 'accepted.txt'), 'Final accepted\n')

        await buildPackFromDirectory({
            outputFile,
            sourceDir
        })

        const buffer = fs.readFileSync(outputFile)
        const parsedPack = await parseJeopardyPackArchive(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
        const zip = await new JSZip().loadAsync(buffer)
        const normalQuestion = getNormalizedQuestionById(parsedPack.declaration, '0-0-0')
        const finalQuestion = getNormalizedQuestionById(parsedPack.declaration, '1-0-0')

        expect(parsedPack.packName).toBe('CLI Pack')
        expect(parsedPack.author).toBe('CLI Test')
        expect(validateJeopardyPackCompatibility(parsedPack.declaration)).toEqual({
            compatible: true
        })
        expect(isFinalRound(parsedPack.declaration, 1)).toBe(true)
        expect(normalQuestion).toMatchObject({
            correctAnswers: ['Correct 1', 'Correct 2'],
            incorrectAnswers: ['Wrong 1'],
            type: 'simple'
        })
        expect(normalQuestion?.questionItems[0]).toMatchObject({
            content: 'Question text',
            type: 'text'
        })
        expect(normalQuestion?.questionItems[1]).toMatchObject({
            isRef: true,
            type: 'image'
        })
        expect(normalQuestion?.answerItems[0]).toMatchObject({
            content: 'Answer reveal',
            type: 'text'
        })
        expect(normalQuestion?.answerItems[1]).toMatchObject({
            content: '<b>Answer html</b>',
            type: 'html'
        })
        expect(finalQuestion?.type).toBe('stakeAll')
        expect(finalQuestion?.questionItems[0]).toMatchObject({
            isRef: true,
            type: 'voice'
        })
        expect(Object.keys(zip.files)).toEqual(expect.arrayContaining(['content.xml', expect.stringMatching(/^Images\//), expect.stringMatching(/^Audio\//)]))
    })
})
