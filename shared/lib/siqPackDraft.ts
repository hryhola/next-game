import JSZip from 'jszip'
import xmlJs from 'xml-js'
import { arrayed } from '../../util/array'
import { type JeopardyDeclaration, type RealtimeJeopardyContentPlacement, type RealtimeJeopardyQuestionType } from '../contracts/jeopardy'
import { getNormalizedQuestionById, parseJeopardyPackArchive } from './jeopardyPack'

const NORMAL_ROUND_COUNT = 3
const THEMES_PER_ROUND = 5
const QUESTIONS_PER_THEME = [100, 200, 300, 400, 500] as const
const FINAL_ROUND_NAME = 'Final Round'
const DEFAULT_PACK_DIFFICULTY = '1'
const DEFAULT_PACK_VERSION = '4'
const PACK_XML_NAMESPACE = 'http://vladimirkhil.com/ygpackage3.0.xsd'

export const JEOPARDY_PACK_EDITOR_QUESTION_TYPES = [
    'simple',
    'stake',
    'stakeAll',
    'secret',
    'secretNoQuestion',
    'secretPublicPrice',
    'noRisk',
    'forYourself',
    'forAll'
] as const

export type JeopardyPackEditorQuestionType = (typeof JEOPARDY_PACK_EDITOR_QUESTION_TYPES)[number]
export type JeopardyPackDraftAtomType = 'html' | 'image' | 'text' | 'video' | 'voice'

export interface JeopardyPackDraftAsset {
    blob: Blob
    fileName: string
    id: string
}

export interface JeopardyPackDraftAtom {
    assetId: string | null
    content: string
    durationMs: number | null
    id: string
    placement: RealtimeJeopardyContentPlacement
    type: JeopardyPackDraftAtomType
    waitForFinish: boolean
}

export interface JeopardyPackDraftQuestion {
    acceptedAnswers: string[]
    answerDurationMs: number | null
    id: string
    postBuzzAtoms: JeopardyPackDraftAtom[]
    preBuzzAtoms: JeopardyPackDraftAtom[]
    price: number
    priceRange: {
        max: number
        min: number
        step: number
    }
    questionTheme: string
    selectionMode: 'any' | 'exceptCurrent'
    type: JeopardyPackEditorQuestionType
    wrongAnswers: string[]
}

export interface JeopardyPackDraftTheme {
    id: string
    name: string
    questions: JeopardyPackDraftQuestion[]
}

export interface JeopardyPackDraftRound {
    id: string
    isFinalRound: boolean
    name: string
    themes: JeopardyPackDraftTheme[]
}

export interface JeopardyPackDraft {
    assets: JeopardyPackDraftAsset[]
    author: string
    dateCreated: string
    difficulty: string
    id: string
    name: string
    rounds: JeopardyPackDraftRound[]
    version: string
}

function createId(): string {
    return crypto.randomUUID()
}

function arrayedOrEmpty<T>(value: T | T[] | null | undefined): T[] {
    if (value === null || value === undefined) {
        return []
    }

    return arrayed(value)
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

function ensureQuestionType(type: string | undefined): JeopardyPackEditorQuestionType {
    switch (type) {
        case 'simple':
        case 'stake':
        case 'stakeAll':
        case 'secret':
        case 'secretNoQuestion':
        case 'secretPublicPrice':
        case 'noRisk':
        case 'forYourself':
        case 'forAll':
            return type
        default:
            return 'simple'
    }
}

function createDefaultAtom(type: JeopardyPackDraftAtomType = 'text'): JeopardyPackDraftAtom {
    return {
        assetId: null,
        content: type === 'html' ? '<p></p>' : '',
        durationMs: null,
        id: createId(),
        placement: type === 'text' ? 'screen' : 'screen',
        type,
        waitForFinish: true
    }
}

function createDefaultQuestion(price: number, type: JeopardyPackEditorQuestionType = 'simple'): JeopardyPackDraftQuestion {
    return {
        acceptedAnswers: [''],
        answerDurationMs: null,
        id: createId(),
        postBuzzAtoms: [createDefaultAtom('text')],
        preBuzzAtoms: [createDefaultAtom('text')],
        price,
        priceRange: {
            max: price,
            min: price,
            step: 100
        },
        questionTheme: '',
        selectionMode: 'exceptCurrent',
        type,
        wrongAnswers: []
    }
}

function createBoilerplateRounds(): JeopardyPackDraftRound[] {
    const rounds: JeopardyPackDraftRound[] = []

    for (let roundIndex = 0; roundIndex < NORMAL_ROUND_COUNT; roundIndex += 1) {
        rounds.push({
            id: createId(),
            isFinalRound: false,
            name: `Round ${roundIndex + 1}`,
            themes: Array.from({ length: THEMES_PER_ROUND }, (_, themeIndex) => ({
                id: createId(),
                name: `Theme ${themeIndex + 1}`,
                questions: QUESTIONS_PER_THEME.map(price => createDefaultQuestion(price, 'simple'))
            }))
        })
    }

    rounds.push({
        id: createId(),
        isFinalRound: true,
        name: FINAL_ROUND_NAME,
        themes: Array.from({ length: THEMES_PER_ROUND }, (_, themeIndex) => ({
            id: createId(),
            name: `Final Theme ${themeIndex + 1}`,
            questions: [createDefaultQuestion(0, 'simple')]
        }))
    })

    return rounds
}

export function createBoilerplateJeopardyPackDraft(): JeopardyPackDraft {
    return {
        assets: [],
        author: '',
        dateCreated: formatDate(new Date()),
        difficulty: DEFAULT_PACK_DIFFICULTY,
        id: createId(),
        name: 'New Jeopardy Pack',
        rounds: createBoilerplateRounds(),
        version: DEFAULT_PACK_VERSION
    }
}

function inferContentAssetFolder(type: JeopardyPackDraftAtomType): 'Audio' | 'Images' | 'Video' | null {
    switch (type) {
        case 'image':
            return 'Images'
        case 'video':
            return 'Video'
        case 'voice':
            return 'Audio'
        default:
            return null
    }
}

function inferMimeType(fileName: string, atomType: JeopardyPackDraftAtomType): string {
    const extension = fileName.split('.').pop()?.toLowerCase()

    if (atomType === 'image') {
        return (
            {
                avif: 'image/avif',
                bmp: 'image/bmp',
                gif: 'image/gif',
                jfif: 'image/jpeg',
                jpg: 'image/jpeg',
                jpeg: 'image/jpeg',
                png: 'image/png',
                svg: 'image/svg+xml',
                webp: 'image/webp'
            }[extension || ''] || 'image/*'
        )
    }

    if (atomType === 'video') {
        return (
            {
                avi: 'video/x-msvideo',
                m4v: 'video/mp4',
                mkv: 'video/x-matroska',
                mov: 'video/quicktime',
                mp4: 'video/mp4',
                webm: 'video/webm'
            }[extension || ''] || 'video/*'
        )
    }

    if (atomType === 'voice') {
        return (
            {
                aac: 'audio/aac',
                flac: 'audio/flac',
                m4a: 'audio/mp4',
                mp3: 'audio/mpeg',
                ogg: 'audio/ogg',
                wav: 'audio/wav'
            }[extension || ''] || 'audio/*'
        )
    }

    if (atomType === 'html') {
        return 'text/html'
    }

    return 'text/plain'
}

function toDraftAtom(
    item: {
        content: string
        durationMs: number | null
        isRef: boolean
        placement: RealtimeJeopardyContentPlacement
        type: JeopardyPackDraftAtomType
        waitForFinish: boolean
    },
    assetId: string | null
): JeopardyPackDraftAtom {
    return {
        assetId,
        content: assetId ? '' : item.content,
        durationMs: item.durationMs,
        id: createId(),
        placement: item.placement,
        type: item.type,
        waitForFinish: item.waitForFinish
    }
}

function toPriceRange(priceOptions: number[], fallbackPrice: number): JeopardyPackDraftQuestion['priceRange'] {
    const normalizedOptions = priceOptions.filter(value => Number.isFinite(value))

    if (!normalizedOptions.length) {
        return {
            max: fallbackPrice,
            min: fallbackPrice,
            step: 100
        }
    }

    if (normalizedOptions.length === 1) {
        return {
            max: normalizedOptions[0],
            min: normalizedOptions[0],
            step: 1
        }
    }

    const min = normalizedOptions[0]
    const max = normalizedOptions[normalizedOptions.length - 1]
    const firstStep = Math.max(1, normalizedOptions[1] - normalizedOptions[0])
    const isArithmetic = normalizedOptions.every((value, index) => index === 0 || value - normalizedOptions[index - 1] === firstStep)

    return {
        max,
        min,
        step: isArithmetic ? firstStep : Math.max(1, max - min)
    }
}

function trimTrailingEmpty(values: string[]): string[] {
    const normalized = values.map(value => value.replace(/\r\n/g, '\n'))

    while (normalized.length > 1 && !normalized[normalized.length - 1]?.trim()) {
        normalized.pop()
    }

    return normalized
}

async function loadAssetFromZip(
    zip: JSZip,
    item: {
        content: string
        isRef: boolean
        type: JeopardyPackDraftAtomType
    }
): Promise<JeopardyPackDraftAsset | null> {
    if (!item.isRef) {
        return null
    }

    const assetFolder = inferContentAssetFolder(item.type)

    if (!assetFolder) {
        return null
    }

    const zipPath = `${assetFolder}/${item.content}`
    const file = zip.file(zipPath)

    if (!file) {
        throw new Error(`Pack asset "${zipPath}" is missing from the archive`)
    }

    const blob = await file.async('blob')

    return {
        blob: new Blob([blob], {
            type: inferMimeType(item.content, item.type)
        }),
        fileName: item.content,
        id: createId()
    }
}

function createContentParam(items: JeopardyDeclaration.ContentItem[], name: 'answer' | 'question'): JeopardyDeclaration.QuestionParameter {
    return {
        _attributes: {
            name
        },
        item: items
    }
}

function createPriceParam(range: JeopardyPackDraftQuestion['priceRange']): JeopardyDeclaration.QuestionParameter {
    return {
        _attributes: {
            name: 'price'
        },
        numberSet: {
            _attributes: {
                maximum: `${range.max}`,
                minimum: `${range.min}`,
                step: `${Math.max(1, range.step)}`
            }
        }
    }
}

function createTextAnswerItems(acceptedAnswers: string[]): JeopardyDeclaration.ContentItem[] {
    return acceptedAnswers
        .map(answer => answer.trim())
        .filter(Boolean)
        .map(answer => ({
            _text: answer
        }))
}

function buildContentItem(atom: JeopardyPackDraftAtom, draft: JeopardyPackDraft, assetFileNameById: Map<string, string>): JeopardyDeclaration.ContentItem {
    const baseAttributes: NonNullable<JeopardyDeclaration.ContentItem['_attributes']> = {
        duration: atom.durationMs && atom.durationMs > 0 ? `${Math.round(atom.durationMs / 1000)}` : undefined,
        placement: atom.placement,
        waitForFinish: atom.waitForFinish ? 'True' : 'False'
    }

    if (!atom.assetId) {
        if (atom.type === 'html') {
            return {
                _attributes: {
                    ...baseAttributes,
                    type: 'html'
                },
                _cdata: atom.content
            }
        }

        if (atom.type === 'text' && atom.placement === 'replic') {
            return {
                _attributes: {
                    ...baseAttributes,
                    type: 'say'
                },
                _text: atom.content
            }
        }

        return {
            _attributes: atom.placement !== 'screen' || atom.durationMs !== null || !atom.waitForFinish ? baseAttributes : undefined,
            _text: atom.content
        }
    }

    const asset = draft.assets.find(entry => entry.id === atom.assetId)

    if (!asset) {
        throw new Error(`Missing draft asset "${atom.assetId}"`)
    }

    const assetFileName = assetFileNameById.get(atom.assetId)

    if (!assetFileName) {
        throw new Error(`Missing generated asset path for "${atom.assetId}"`)
    }

    return {
        _attributes: {
            ...baseAttributes,
            isRef: 'True',
            type: atom.type === 'voice' ? 'voice' : atom.type
        },
        _text: `@${assetFileName}`
    }
}

function buildQuestionParams(
    question: JeopardyPackDraftQuestion,
    draft: JeopardyPackDraft,
    assetFileNameById: Map<string, string>
): JeopardyDeclaration.QuestionParameter[] {
    const params: JeopardyDeclaration.QuestionParameter[] = [
        createContentParam(
            question.preBuzzAtoms.map(atom => buildContentItem(atom, draft, assetFileNameById)),
            'question'
        )
    ]

    const answerItems = question.postBuzzAtoms.map(atom => buildContentItem(atom, draft, assetFileNameById))

    if (answerItems.length) {
        params.push(createContentParam(answerItems, 'answer'))
    }

    if (question.answerDurationMs && question.answerDurationMs > 0) {
        params.push({
            _attributes: {
                name: 'answerDuration'
            },
            _text: `${Math.round(question.answerDurationMs / 1000)}`
        })
    }

    if (question.questionTheme.trim()) {
        params.push({
            _attributes: {
                name: 'theme'
            },
            _text: question.questionTheme.trim()
        })
    }

    if (question.selectionMode === 'any') {
        params.push({
            _attributes: {
                name: 'selectionMode'
            },
            _text: question.selectionMode
        })
    }

    if (question.priceRange.min !== question.price || question.priceRange.max !== question.price || question.priceRange.step > 1) {
        params.push(createPriceParam(question.priceRange))
    }

    return params
}

function createArchiveAssetFileName(atom: JeopardyPackDraftAtom, asset: JeopardyPackDraftAsset, atomIndex: number, prefix: string): string {
    const extension = asset.fileName.includes('.') ? `.${asset.fileName.split('.').pop()}` : ''
    const sanitizedStem = sanitizeFileStem(asset.fileName.replace(/\.[^.]+$/, '')) || atom.type

    return `${prefix}_${String(atomIndex + 1).padStart(2, '0')}_${sanitizedStem}${extension}`
}

function guessQuestionPrice(question: JeopardyPackDraftQuestion, isFinalRound: boolean): `${number}` {
    return `${isFinalRound ? 0 : Math.max(0, Math.round(question.price))}` as `${number}`
}

function collectAssetFileNames(draft: JeopardyPackDraft): Map<string, string> {
    const fileNames = new Map<string, string>()

    draft.rounds.forEach((round, roundIndex) => {
        round.themes.forEach((theme, themeIndex) => {
            theme.questions.forEach((question, questionIndex) => {
                const questionAtoms = [...question.preBuzzAtoms, ...question.postBuzzAtoms]

                questionAtoms.forEach((atom, atomIndex) => {
                    if (!atom.assetId || fileNames.has(atom.assetId)) {
                        return
                    }

                    const asset = draft.assets.find(entry => entry.id === atom.assetId)

                    if (!asset) {
                        return
                    }

                    const prefix = `r${String(roundIndex + 1).padStart(2, '0')}_t${String(themeIndex + 1).padStart(2, '0')}_q${String(
                        questionIndex + 1
                    ).padStart(2, '0')}`

                    fileNames.set(atom.assetId, createArchiveAssetFileName(atom, asset, atomIndex, prefix))
                })
            })
        })
    })

    return fileNames
}

export async function parseJeopardyPackDraftArchive(archive: ArrayBuffer): Promise<JeopardyPackDraft> {
    const parsed = await parseJeopardyPackArchive(archive)
    const zip = await new JSZip().loadAsync(archive)
    const rounds = arrayedOrEmpty(parsed.declaration.package.rounds.round)
    const assets: JeopardyPackDraftAsset[] = []

    const draftRounds = await Promise.all(
        rounds.map(async (round, roundIndex) => {
            const themes = arrayedOrEmpty(round.themes?.theme)

            return {
                id: createId(),
                isFinalRound: round._attributes.type === 'final' || round._attributes.type === 'themeList',
                name: round._attributes.name,
                themes: await Promise.all(
                    themes.map(async (theme, themeIndex) => {
                        const questions = arrayedOrEmpty(theme.questions?.question)

                        return {
                            id: createId(),
                            name: theme._attributes.name,
                            questions: await Promise.all(
                                questions.map(async (rawQuestion, questionIndex) => {
                                    const normalized = getNormalizedQuestionById(
                                        parsed.declaration,
                                        `${roundIndex}-${themeIndex}-${questionIndex}` as `${number}-${number}-${number}`
                                    )

                                    if (!normalized) {
                                        throw new Error(`Could not normalize question ${roundIndex}-${themeIndex}-${questionIndex}`)
                                    }

                                    const importAtoms = async (items: typeof normalized.questionItems): Promise<JeopardyPackDraftAtom[]> => {
                                        const atoms: JeopardyPackDraftAtom[] = []

                                        for (const item of items) {
                                            const asset = await loadAssetFromZip(zip, {
                                                content: item.content,
                                                isRef: item.isRef,
                                                type: item.type
                                            })

                                            if (asset) {
                                                assets.push(asset)
                                            }

                                            atoms.push(toDraftAtom(item, asset?.id || null))
                                        }

                                        return atoms
                                    }

                                    return {
                                        acceptedAnswers: trimTrailingEmpty(normalized.correctAnswers.length ? normalized.correctAnswers : ['']),
                                        answerDurationMs: normalized.answerDurationMs,
                                        id: createId(),
                                        postBuzzAtoms: await importAtoms(normalized.answerItems),
                                        preBuzzAtoms: await importAtoms(normalized.questionItems),
                                        price: Number(rawQuestion._attributes.price),
                                        priceRange: toPriceRange(normalized.priceOptions, Number(rawQuestion._attributes.price)),
                                        questionTheme: normalized.questionTheme || '',
                                        selectionMode: normalized.selectionMode,
                                        type: ensureQuestionType(normalized.type),
                                        wrongAnswers: trimTrailingEmpty(normalized.incorrectAnswers)
                                    } satisfies JeopardyPackDraftQuestion
                                })
                            )
                        } satisfies JeopardyPackDraftTheme
                    })
                )
            } satisfies JeopardyPackDraftRound
        })
    )

    return {
        assets,
        author: parsed.author,
        dateCreated: parsed.declaration.package._attributes.date,
        difficulty: parsed.declaration.package._attributes.difficulty || DEFAULT_PACK_DIFFICULTY,
        id: parsed.declaration.package._attributes.id || createId(),
        name: parsed.packName,
        rounds: draftRounds,
        version: parsed.declaration.package._attributes.version || DEFAULT_PACK_VERSION
    }
}

export async function buildJeopardyPackArchiveFromDraft(draft: JeopardyPackDraft): Promise<{
    archive: Blob
    declaration: JeopardyDeclaration.Pack
}> {
    const zip = new JSZip()
    const assetFileNameById = collectAssetFileNames(draft)
    const rounds = draft.rounds.map(round => ({
        _attributes: {
            name: round.name,
            type: round.isFinalRound ? 'final' : undefined
        },
        themes: {
            theme: round.themes.map(theme => ({
                _attributes: {
                    name: theme.name
                },
                questions: {
                    question: theme.questions.map(question => {
                        const params = buildQuestionParams(question, draft, assetFileNameById)
                        const textualAnswerItems = createTextAnswerItems(question.acceptedAnswers)

                        return {
                            _attributes: {
                                price: guessQuestionPrice(question, round.isFinalRound),
                                type: question.type
                            },
                            params: {
                                param: params
                            },
                            right: {
                                answer: textualAnswerItems.length
                                    ? textualAnswerItems
                                    : [
                                          {
                                              _text: 'TODO'
                                          }
                                      ]
                            },
                            wrong: question.wrongAnswers.filter(answer => answer.trim()).length
                                ? {
                                      answer: question.wrongAnswers
                                          .filter(answer => answer.trim())
                                          .map(answer => ({
                                              _text: answer.trim()
                                          }))
                                  }
                                : undefined
                        } satisfies JeopardyDeclaration.Question
                    })
                }
            }))
        }
    })) satisfies JeopardyDeclaration.Round[]

    const declaration: JeopardyDeclaration.Pack = {
        _declaration: {
            _attributes: {
                encoding: 'utf-8',
                version: '1.0'
            }
        },
        package: {
            _attributes: {
                date: (draft.dateCreated || formatDate(new Date())) as `${number}.${number}.${number}`,
                difficulty: draft.difficulty || DEFAULT_PACK_DIFFICULTY,
                id: draft.id || createId(),
                name: draft.name || 'Untitled Jeopardy Pack',
                version: draft.version || DEFAULT_PACK_VERSION,
                xmlns: PACK_XML_NAMESPACE
            },
            info: {
                authors: {
                    author: {
                        _text: draft.author || 'Unknown author'
                    }
                }
            },
            rounds: {
                round: rounds
            }
        }
    }

    const xml = `<?xml version="1.0" encoding="utf-8"?>\n${xmlJs.js2xml(declaration, { compact: true, spaces: 2 })}`

    zip.file('content.xml', xml)

    for (const asset of draft.assets) {
        const targetFileName = assetFileNameById.get(asset.id)

        if (!targetFileName) {
            continue
        }

        const atom = draft.rounds
            .flatMap(round => round.themes)
            .flatMap(theme => theme.questions)
            .flatMap(question => [...question.preBuzzAtoms, ...question.postBuzzAtoms])
            .find(entry => entry.assetId === asset.id)

        if (!atom) {
            continue
        }

        const folder = inferContentAssetFolder(atom.type)

        if (!folder) {
            continue
        }

        zip.file(`${folder}/${targetFileName}`, await asset.blob.arrayBuffer())
    }

    return {
        archive: await zip.generateAsync({
            compression: 'DEFLATE',
            type: 'blob'
        }),
        declaration
    }
}
