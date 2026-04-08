import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import JSZip from 'jszip'
import xmlJs from 'xml-js'
import { JeopardyDeclaration, RealtimeJeopardyQuestionType } from '../../../shared/contracts/jeopardy'

const NORMAL_ROUND_COUNT = 3
const THEMES_PER_ROUND = 5
const QUESTIONS_PER_THEME = ['100', '200', '300', '400', '500'] as const
const FINAL_ROUND_NAME = 'Фінальний раунд'
const FINAL_QUESTION_FOLDER_NAME = '1'
const PACK_METADATA_FILE = 'pack.json'
const ACCEPTED_ANSWERS_FILE = 'accepted.txt'
const WRONG_ANSWERS_FILE = 'wrong.txt'
const TYPE_FILE = 'type.txt'

const IMAGE_EXTENSIONS = new Set(['.avif', '.bmp', '.gif', '.jpeg', '.jpg', '.jfif', '.png', '.svg', '.webp'])
const AUDIO_EXTENSIONS = new Set(['.aac', '.flac', '.m4a', '.mp3', '.ogg', '.wav'])
const VIDEO_EXTENSIONS = new Set(['.avi', '.m4v', '.mkv', '.mov', '.mp4', '.webm'])
const HTML_EXTENSIONS = new Set(['.htm', '.html'])
const TEXT_EXTENSIONS = new Set(['.md', '.txt'])

const SUPPORTED_QUESTION_TYPES = new Set<RealtimeJeopardyQuestionType | 'auction' | 'bagcat' | 'cat' | 'sponsored' | 'withButton'>([
    'auction',
    'bagcat',
    'cat',
    'forAll',
    'forYourself',
    'noRisk',
    'secret',
    'secretNoQuestion',
    'secretPublicPrice',
    'simple',
    'sponsored',
    'stake',
    'stakeAll',
    'withButton'
])

export interface BoilerplateOptions {
    targetDir: string
}

export interface BuildPackOptions {
    outputFile?: string
    sourceDir: string
}

interface PackMetadata {
    author?: string
    difficulty?: string
    name?: string
    version?: string
}

interface AssetFile {
    sourcePath: string
    zipPath: string
}

interface BuiltPackResult {
    declaration: JeopardyDeclaration.Pack
    outputFile: string
}

function naturalSort(values: string[]): string[] {
    return [...values].sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }))
}

async function pathExists(targetPath: string): Promise<boolean> {
    try {
        await fs.promises.access(targetPath)
        return true
    } catch {
        return false
    }
}

async function ensureDir(targetPath: string): Promise<void> {
    await fs.promises.mkdir(targetPath, { recursive: true })
}

async function writeFileIfMissing(filePath: string, content: string): Promise<void> {
    if (await pathExists(filePath)) {
        return
    }

    await ensureDir(path.dirname(filePath))
    await fs.promises.writeFile(filePath, content, 'utf8')
}

function formatDate(date: Date): `${number}.${number}.${number}` {
    const day = `${date.getDate()}`.padStart(2, '0')
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const year = `${date.getFullYear()}`

    return `${day}.${month}.${year}` as `${number}.${number}.${number}`
}

function sanitizeFileStem(value: string): string {
    return value
        .normalize('NFKD')
        .replace(/[^\w.-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 48)
}

async function listDirectories(parentDir: string): Promise<string[]> {
    const entries = await fs.promises.readdir(parentDir, { withFileTypes: true })

    return naturalSort(
        entries
            .filter(entry => entry.isDirectory() && !entry.name.startsWith('.') && !entry.name.startsWith('_'))
            .map(entry => path.join(parentDir, entry.name))
    )
}

async function listFiles(parentDir: string): Promise<string[]> {
    const entries = await fs.promises.readdir(parentDir, { withFileTypes: true })

    return naturalSort(
        entries.filter(entry => entry.isFile() && !entry.name.startsWith('.') && !entry.name.startsWith('_')).map(entry => path.join(parentDir, entry.name))
    )
}

function getQuestionAtomSortKey(filePath: string): number {
    const parsed = path.parse(filePath)

    return Number(parsed.name)
}

function getAnswerAtomSortKey(filePath: string): number {
    const parsed = path.parse(filePath)
    const match = parsed.name.match(/^answer(\d+)?$/i)

    if (!match) {
        return Number.POSITIVE_INFINITY
    }

    return match[1] ? Number(match[1]) : 1
}

function createDefaultPackMetadata(targetDir: string): PackMetadata {
    return {
        author: 'TODO: author',
        difficulty: '1',
        name: path.basename(targetDir),
        version: '4'
    }
}

async function readPackMetadata(sourceDir: string): Promise<PackMetadata> {
    const metadataPath = path.join(sourceDir, PACK_METADATA_FILE)

    if (!(await pathExists(metadataPath))) {
        return createDefaultPackMetadata(sourceDir)
    }

    const raw = await fs.promises.readFile(metadataPath, 'utf8')
    const parsed = JSON.parse(raw) as PackMetadata

    return {
        ...createDefaultPackMetadata(sourceDir),
        ...parsed
    }
}

async function readLinesFile(filePath: string): Promise<string[]> {
    if (!(await pathExists(filePath))) {
        return []
    }

    const raw = await fs.promises.readFile(filePath, 'utf8')

    return raw
        .replace(/\r\n/g, '\n')
        .split('\n')
        .map(line => line.trim())
        .filter(line => Boolean(line) && !line.startsWith('#'))
}

function inferContentKind(filePath: string): 'audio' | 'html' | 'image' | 'text' | 'video' {
    const extension = path.extname(filePath).toLowerCase()

    if (IMAGE_EXTENSIONS.has(extension)) {
        return 'image'
    }

    if (AUDIO_EXTENSIONS.has(extension)) {
        return 'audio'
    }

    if (VIDEO_EXTENSIONS.has(extension)) {
        return 'video'
    }

    if (HTML_EXTENSIONS.has(extension)) {
        return 'html'
    }

    if (TEXT_EXTENSIONS.has(extension)) {
        return 'text'
    }

    throw new Error(`Unsupported atom file extension "${extension}" in ${filePath}`)
}

async function createContentItemFromFile(
    filePath: string,
    assetPrefix: string
): Promise<{
    asset?: AssetFile
    item: JeopardyDeclaration.ContentItem
}> {
    const kind = inferContentKind(filePath)

    if (kind === 'text' || kind === 'html') {
        const raw = (await fs.promises.readFile(filePath, 'utf8')).replace(/\r\n/g, '\n').trimEnd()

        return {
            item:
                kind === 'html'
                    ? {
                          _attributes: {
                              type: 'html'
                          },
                          _cdata: raw
                      }
                    : {
                          _text: raw
                      }
        }
    }

    const extension = path.extname(filePath).toLowerCase()
    const originalStem = sanitizeFileStem(path.parse(filePath).name) || 'asset'
    const assetName = `${assetPrefix}_${originalStem}${extension}`
    const zipRoot = kind === 'image' ? 'Images' : kind === 'audio' ? 'Audio' : 'Video'
    const contentType = kind === 'audio' ? 'voice' : kind

    return {
        asset: {
            sourcePath: filePath,
            zipPath: `${zipRoot}/${assetName}`
        },
        item: {
            _attributes: {
                isRef: 'True',
                type: contentType
            },
            _text: `@${assetName}`
        }
    }
}

async function buildQuestionFromDirectory(
    questionDir: string,
    options: {
        isFinalRound: boolean
        price: string
        roundOrdinal: number
        themeOrdinal: number
    }
): Promise<{
    assets: AssetFile[]
    question: JeopardyDeclaration.Question
}> {
    const typeFilePath = path.join(questionDir, TYPE_FILE)

    if (!(await pathExists(typeFilePath))) {
        throw new Error(`Missing ${TYPE_FILE} in ${questionDir}`)
    }

    const type = (await fs.promises.readFile(typeFilePath, 'utf8')).trim()

    if (!SUPPORTED_QUESTION_TYPES.has(type as RealtimeJeopardyQuestionType)) {
        throw new Error(`Unsupported question type "${type}" in ${questionDir}`)
    }

    const allFiles = await listFiles(questionDir)
    const questionAtomFiles = allFiles
        .filter(filePath => /^\d+$/.test(path.parse(filePath).name))
        .sort((left, right) => getQuestionAtomSortKey(left) - getQuestionAtomSortKey(right))
    const answerAtomFiles = allFiles
        .filter(filePath => /^answer(\d+)?$/i.test(path.parse(filePath).name))
        .sort((left, right) => getAnswerAtomSortKey(left) - getAnswerAtomSortKey(right))

    if (!questionAtomFiles.length) {
        throw new Error(`Question "${questionDir}" does not contain any numbered pre-buzz atoms.`)
    }

    const acceptedAnswers = await readLinesFile(path.join(questionDir, ACCEPTED_ANSWERS_FILE))
    const wrongAnswers = await readLinesFile(path.join(questionDir, WRONG_ANSWERS_FILE))
    const assets: AssetFile[] = []

    const questionItems = await Promise.all(
        questionAtomFiles.map(async (filePath, index) => {
            const built = await createContentItemFromFile(
                filePath,
                `r${String(options.roundOrdinal).padStart(2, '0')}_t${String(options.themeOrdinal).padStart(2, '0')}_q${sanitizeFileStem(
                    options.price
                )}_pre${String(index + 1).padStart(2, '0')}`
            )

            if (built.asset) {
                assets.push(built.asset)
            }

            return built.item
        })
    )

    const answerItems = await Promise.all(
        answerAtomFiles.map(async (filePath, index) => {
            const built = await createContentItemFromFile(
                filePath,
                `r${String(options.roundOrdinal).padStart(2, '0')}_t${String(options.themeOrdinal).padStart(2, '0')}_q${sanitizeFileStem(
                    options.price
                )}_ans${String(index + 1).padStart(2, '0')}`
            )

            if (built.asset) {
                assets.push(built.asset)
            }

            return built.item
        })
    )

    const fallbackAcceptedAnswers = await Promise.all(
        answerAtomFiles
            .filter(filePath => inferContentKind(filePath) === 'text')
            .map(async filePath => (await fs.promises.readFile(filePath, 'utf8')).replace(/\r\n/g, '\n').trim())
    )
    const correctAnswers = acceptedAnswers.length ? acceptedAnswers : fallbackAcceptedAnswers.filter(Boolean)

    if (!correctAnswers.length) {
        throw new Error(`Question "${questionDir}" does not define any accepted answers. Add ${ACCEPTED_ANSWERS_FILE} or textual answer atoms.`)
    }

    const params: JeopardyDeclaration.QuestionParameter[] = [
        {
            _attributes: {
                name: 'question'
            },
            item: questionItems
        }
    ]

    if (answerItems.length) {
        params.push({
            _attributes: {
                name: 'answer'
            },
            item: answerItems
        })
    }

    return {
        assets,
        question: {
            _attributes: {
                price: options.isFinalRound ? '0' : (options.price as `${number}`),
                type
            },
            params: {
                param: params
            },
            right: {
                answer: correctAnswers.map(answer => ({
                    _text: answer
                }))
            },
            wrong: wrongAnswers.length
                ? {
                      answer: wrongAnswers.map(answer => ({
                          _text: answer
                      }))
                  }
                : undefined
        }
    }
}

export async function createBoilerplatePack(options: BoilerplateOptions): Promise<void> {
    await ensureDir(options.targetDir)
    await writeFileIfMissing(path.join(options.targetDir, PACK_METADATA_FILE), `${JSON.stringify(createDefaultPackMetadata(options.targetDir), null, 2)}\n`)

    for (let roundIndex = 1; roundIndex <= NORMAL_ROUND_COUNT; roundIndex += 1) {
        const roundDir = path.join(options.targetDir, `Раунд ${roundIndex}`)

        for (let themeIndex = 1; themeIndex <= THEMES_PER_ROUND; themeIndex += 1) {
            const themeDir = path.join(roundDir, `Тема ${themeIndex}`)

            for (const price of QUESTIONS_PER_THEME) {
                const questionDir = path.join(themeDir, price)
                await ensureDir(questionDir)
                await writeFileIfMissing(path.join(questionDir, TYPE_FILE), 'simple\n')
                await writeFileIfMissing(path.join(questionDir, '1.txt'), 'TODO: write the question prompt here.\n')
                await writeFileIfMissing(path.join(questionDir, 'answer.txt'), 'TODO: write the answer reveal here.\n')
                await writeFileIfMissing(path.join(questionDir, ACCEPTED_ANSWERS_FILE), 'TODO: accepted answer\n')
            }
        }
    }

    const finalRoundDir = path.join(options.targetDir, FINAL_ROUND_NAME)

    for (let themeIndex = 1; themeIndex <= THEMES_PER_ROUND; themeIndex += 1) {
        const questionDir = path.join(finalRoundDir, `Тема ${themeIndex}`, FINAL_QUESTION_FOLDER_NAME)

        await ensureDir(questionDir)
        await writeFileIfMissing(path.join(questionDir, TYPE_FILE), 'stakeAll\n')
        await writeFileIfMissing(path.join(questionDir, '1.txt'), 'TODO: write the final round question prompt here.\n')
        await writeFileIfMissing(path.join(questionDir, 'answer.txt'), 'TODO: write the final round answer reveal here.\n')
        await writeFileIfMissing(path.join(questionDir, ACCEPTED_ANSWERS_FILE), 'TODO: accepted final answer\n')
    }
}

export async function buildPackFromDirectory(options: BuildPackOptions): Promise<BuiltPackResult> {
    const roundDirs = await listDirectories(options.sourceDir)

    if (!roundDirs.length) {
        throw new Error(`No round directories found in ${options.sourceDir}`)
    }

    const metadata = await readPackMetadata(options.sourceDir)
    const assets: AssetFile[] = []

    const rounds = await Promise.all(
        roundDirs.map(async (roundDir, roundIndex) => {
            const isFinalRound = roundIndex === roundDirs.length - 1
            const themeDirs = await listDirectories(roundDir)

            if (!themeDirs.length) {
                throw new Error(`Round "${path.basename(roundDir)}" does not contain any theme directories.`)
            }

            const themes = await Promise.all(
                themeDirs.map(async (themeDir, themeIndex) => {
                    const questionDirs = await listDirectories(themeDir)

                    if (!questionDirs.length) {
                        throw new Error(`Theme "${path.basename(themeDir)}" does not contain any question directories.`)
                    }

                    if (isFinalRound && questionDirs.length !== 1) {
                        throw new Error(`Final round theme "${path.basename(themeDir)}" must contain exactly one question folder.`)
                    }

                    const questions = await Promise.all(
                        questionDirs.map(async questionDir => {
                            const questionFolderName = path.basename(questionDir)

                            if (!isFinalRound && !/^\d+$/.test(questionFolderName)) {
                                throw new Error(`Question folder "${questionFolderName}" in theme "${path.basename(themeDir)}" must be a numeric price.`)
                            }

                            const built = await buildQuestionFromDirectory(questionDir, {
                                isFinalRound,
                                price: questionFolderName,
                                roundOrdinal: roundIndex + 1,
                                themeOrdinal: themeIndex + 1
                            })

                            assets.push(...built.assets)

                            return built.question
                        })
                    )

                    return {
                        _attributes: {
                            name: path.basename(themeDir)
                        },
                        questions: {
                            question: questions
                        }
                    } satisfies JeopardyDeclaration.Theme
                })
            )

            return {
                _attributes: {
                    name: path.basename(roundDir),
                    type: isFinalRound ? 'final' : undefined
                },
                themes: {
                    theme: themes
                }
            } satisfies JeopardyDeclaration.Round
        })
    )

    const declaration: JeopardyDeclaration.Pack = {
        _declaration: {
            _attributes: {
                encoding: 'utf-8',
                version: '1.0'
            }
        },
        package: {
            _attributes: {
                date: formatDate(new Date()),
                difficulty: metadata.difficulty || '1',
                id: crypto.randomUUID(),
                name: metadata.name || path.basename(options.sourceDir),
                version: metadata.version || '4',
                xmlns: 'http://vladimirkhil.com/ygpackage3.0.xsd'
            },
            info: {
                authors: {
                    author: {
                        _text: metadata.author || 'Unknown author'
                    }
                }
            },
            rounds: {
                round: rounds
            }
        }
    }

    const xml = `<?xml version="1.0" encoding="utf-8"?>\n${xmlJs.js2xml(declaration, { compact: true, spaces: 2 })}`
    const zip = new JSZip()

    zip.file('content.xml', xml)

    for (const asset of assets) {
        const buffer = await fs.promises.readFile(asset.sourcePath)
        zip.file(asset.zipPath, buffer)
    }

    const outputFile = options.outputFile || path.resolve(path.dirname(options.sourceDir), `${path.basename(options.sourceDir)}.siq`)
    const archive = await zip.generateAsync({
        compression: 'DEFLATE',
        type: 'nodebuffer'
    })

    await fs.promises.writeFile(outputFile, archive)

    return {
        declaration,
        outputFile
    }
}
