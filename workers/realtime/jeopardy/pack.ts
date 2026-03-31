import JSZip from 'jszip'
import xml2js from 'xml-js'
import {
    JeopardyDeclaration,
    RealtimeJeopardyContentPlacement,
    RealtimeJeopardyQuestionId,
    RealtimeJeopardyQuestionType,
    RealtimeJeopardyThemeId
} from '../../../shared/contracts/jeopardy'
import { arrayed } from '../../../util/array'

const DEFAULT_PRICE_MULTIPLIER = 2

export interface ParsedJeopardyPack {
    author: string
    dateCreated: string
    declaration: JeopardyDeclaration.Pack
    packName: string
}

export interface NormalizedJeopardyContentItem {
    content: string
    durationMs: number | null
    isRef: boolean
    placement: RealtimeJeopardyContentPlacement
    type: 'html' | 'image' | 'text' | 'video' | 'voice'
    waitForFinish: boolean
}

export interface NormalizedJeopardyQuestion {
    answerDurationMs: number | null
    answerItems: NormalizedJeopardyContentItem[]
    correctAnswers: string[]
    incorrectAnswers: string[]
    isNoRisk: boolean
    price: number
    priceMultiplier: number
    priceOptions: number[]
    questionItems: NormalizedJeopardyContentItem[]
    questionTheme: string | null
    selectionMode: 'any' | 'exceptCurrent'
    type: RealtimeJeopardyQuestionType
}

function arrayedOrEmpty<T>(value: T | T[] | null | undefined): T[] {
    if (value === null || value === undefined) {
        return []
    }

    return arrayed(value)
}

function getRounds(declaration: JeopardyDeclaration.Pack): JeopardyDeclaration.Round[] {
    return arrayedOrEmpty(declaration.package.rounds.round)
}

function getThemes(round: JeopardyDeclaration.Round | null | undefined): JeopardyDeclaration.Theme[] {
    return arrayedOrEmpty(round?.themes?.theme)
}

function getQuestions(theme: JeopardyDeclaration.Theme | null | undefined): JeopardyDeclaration.Question[] {
    return arrayedOrEmpty(theme?.questions?.question)
}

function getPrimaryAuthor(declaration: JeopardyDeclaration.Pack): string {
    const authors = arrayedOrEmpty(declaration.package.info?.authors?.author)

    return authors.map(author => author._text).find(Boolean) || 'Unknown author'
}

function isFinalRoundType(type: string | undefined): boolean {
    return type === 'final' || type === 'themeList'
}

function getRawQuestionType(question: JeopardyDeclaration.Question): string {
    const legacyTypeName = question.type?._attributes?.name || question.type?._text
    const rawType = question._attributes?.type || legacyTypeName || ''

    return rawType.trim()
}

function getLegacyTypeParamMap(question: JeopardyDeclaration.Question): Record<string, string> {
    return Object.fromEntries(
        arrayedOrEmpty(question.type?.param)
            .map(param => [param._attributes.name, param._text || ''])
            .filter(([name]) => Boolean(name))
    )
}

function getParamMap(question: JeopardyDeclaration.Question): Map<string, JeopardyDeclaration.QuestionParameter> {
    return new Map(arrayedOrEmpty(question.params?.param).map(param => [param._attributes.name, param]))
}

function getParamText(param: JeopardyDeclaration.QuestionParameter | null | undefined): string {
    return param?._text || param?._cdata || ''
}

function toBoolean(value: boolean | string | undefined, fallback: boolean): boolean {
    if (typeof value === 'boolean') {
        return value
    }

    if (value === 'True') {
        return true
    }

    if (value === 'False') {
        return false
    }

    return fallback
}

function parseDurationMs(value: string | undefined): number | null {
    if (!value) {
        return null
    }

    if (/^\d+$/.test(value)) {
        return Number(value) * 1000
    }

    const parts = value.split(':').map(part => Number(part))

    if (parts.some(part => !Number.isFinite(part))) {
        return null
    }

    let totalSeconds = 0

    for (const part of parts) {
        totalSeconds = totalSeconds * 60 + part
    }

    return totalSeconds * 1000
}

function normalizeItemType(type: JeopardyDeclaration.ContentType | undefined): 'html' | 'image' | 'text' | 'video' | 'voice' {
    switch (type) {
        case 'audio':
        case 'voice':
            return 'voice'
        case 'html':
            return 'html'
        case 'image':
            return 'image'
        case 'video':
            return 'video'
        case 'say':
        case 'text':
        default:
            return 'text'
    }
}

function normalizePlacement(
    type: JeopardyDeclaration.ContentType | undefined,
    placement: JeopardyDeclaration.ContentPlacement | undefined
): RealtimeJeopardyContentPlacement {
    if (placement === 'background' || placement === 'replic' || placement === 'screen') {
        return placement
    }

    if (type === 'say') {
        return 'replic'
    }

    return 'screen'
}

function normalizeContentItem(item: JeopardyDeclaration.ContentItem): NormalizedJeopardyContentItem | null {
    const rawType = item._attributes?.type

    if (rawType === 'marker') {
        return null
    }

    const rawContent = item._text || item._cdata || ''
    const isRef = toBoolean(item._attributes?.isRef, Boolean(rawType && rawType !== 'text' && rawType !== 'say' && rawType !== 'html'))
    const content = isRef && rawContent.startsWith('@') ? rawContent.slice(1) : rawContent

    return {
        content,
        durationMs: parseDurationMs(item._attributes?.duration),
        isRef,
        placement: normalizePlacement(rawType, item._attributes?.placement),
        type: normalizeItemType(rawType),
        waitForFinish: toBoolean(item._attributes?.waitForFinish, true)
    }
}

function extractScenarioItems(question: JeopardyDeclaration.Question): [NormalizedJeopardyContentItem[], NormalizedJeopardyContentItem[]] {
    const beforeMarker: NormalizedJeopardyContentItem[] = []
    const afterMarker: NormalizedJeopardyContentItem[] = []
    let markerPassed = false

    for (const atom of arrayedOrEmpty(question.scenario?.atom)) {
        if (atom._attributes?.type === 'marker') {
            markerPassed = true
            continue
        }

        const item = normalizeContentItem(atom)

        if (!item) {
            continue
        }

        if (markerPassed) {
            afterMarker.push(item)
        } else {
            beforeMarker.push(item)
        }
    }

    return [beforeMarker, afterMarker]
}

function extractContentItemsFromParam(param: JeopardyDeclaration.QuestionParameter | null | undefined): NormalizedJeopardyContentItem[] {
    return arrayedOrEmpty(param?.item)
        .map(item => normalizeContentItem(item))
        .filter((item): item is NormalizedJeopardyContentItem => Boolean(item))
}

function extractPriceOptions(question: JeopardyDeclaration.Question, fallbackPrice: number): number[] {
    const params = getParamMap(question)
    const modernPrice = params.get('price')
    const numberSet = modernPrice?.numberSet?._attributes

    if (numberSet) {
        const minimum = Number(numberSet.minimum ?? fallbackPrice)
        const maximum = Number(numberSet.maximum ?? minimum)
        const step = Number(numberSet.step ?? 0)

        if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum > maximum) {
            return [fallbackPrice]
        }

        if (step > 0) {
            const values: number[] = []

            for (let value = minimum; value <= maximum; value += step) {
                values.push(value)
            }

            return values.length ? values : [fallbackPrice]
        }

        return minimum === maximum ? [minimum] : [minimum, maximum]
    }

    const legacyCost = getLegacyTypeParamMap(question).cost

    if (legacyCost && /^-?\d+$/.test(legacyCost.trim())) {
        return [Number(legacyCost.trim())]
    }

    return [fallbackPrice]
}

function normalizeLegacyQuestionType(question: JeopardyDeclaration.Question): {
    isNoRisk: boolean
    priceMultiplier: number
    questionTheme: string | null
    selectionMode: 'any' | 'exceptCurrent'
    type: RealtimeJeopardyQuestionType
} {
    const params = getParamMap(question)
    const legacyParams = getLegacyTypeParamMap(question)
    const rawType = getRawQuestionType(question)
    const requestedSelectionMode = getParamText(params.get('selectionMode'))
    const selectionMode =
        requestedSelectionMode === 'any' || requestedSelectionMode === 'exceptCurrent'
            ? requestedSelectionMode
            : legacyParams.self === 'true'
              ? 'any'
              : 'exceptCurrent'
    const modernTheme = getParamText(params.get('theme'))
    const legacyTheme = legacyParams.theme || null

    switch (rawType) {
        case '':
        case 'simple':
        case 'withButton':
            return {
                isNoRisk: false,
                priceMultiplier: 1,
                questionTheme: modernTheme || legacyTheme,
                selectionMode,
                type: 'simple'
            }
        case 'auction':
        case 'stake':
            return {
                isNoRisk: false,
                priceMultiplier: 1,
                questionTheme: modernTheme || legacyTheme,
                selectionMode,
                type: 'stake'
            }
        case 'stakeAll':
            return {
                isNoRisk: false,
                priceMultiplier: 1,
                questionTheme: modernTheme || legacyTheme,
                selectionMode,
                type: 'stakeAll'
            }
        case 'cat':
            return {
                isNoRisk: false,
                priceMultiplier: 1,
                questionTheme: modernTheme || legacyTheme,
                selectionMode: 'exceptCurrent',
                type: 'secret'
            }
        case 'bagcat': {
            const knows = legacyParams.knows || 'after'

            return {
                isNoRisk: false,
                priceMultiplier: 1,
                questionTheme: modernTheme || legacyTheme,
                selectionMode: legacyParams.self === 'true' ? 'any' : 'exceptCurrent',
                type: knows === 'before' ? 'secretPublicPrice' : knows === 'never' ? 'secretNoQuestion' : 'secret'
            }
        }
        case 'secret':
        case 'secretPublicPrice':
        case 'secretNoQuestion':
            return {
                isNoRisk: false,
                priceMultiplier: 1,
                questionTheme: modernTheme || legacyTheme,
                selectionMode,
                type: rawType
            }
        case 'sponsored':
        case 'noRisk':
        case 'forYourself':
            return {
                isNoRisk: true,
                priceMultiplier: DEFAULT_PRICE_MULTIPLIER,
                questionTheme: modernTheme || legacyTheme,
                selectionMode,
                type: rawType === 'forYourself' ? 'forYourself' : 'noRisk'
            }
        case 'forAll':
            return {
                isNoRisk: false,
                priceMultiplier: 1,
                questionTheme: modernTheme || legacyTheme,
                selectionMode,
                type: 'forAll'
            }
        case 'custom':
        default:
            return {
                isNoRisk: false,
                priceMultiplier: 1,
                questionTheme: modernTheme || legacyTheme,
                selectionMode,
                type: 'custom'
            }
    }
}

export async function parseJeopardyPackArchive(archive: ArrayBuffer): Promise<ParsedJeopardyPack> {
    const zip = await new JSZip().loadAsync(archive)
    const contentXmlFile = zip.files['content.xml']

    if (!contentXmlFile) {
        throw new Error("Jeopardy pack is missing 'content.xml'")
    }

    const contentXml = await contentXmlFile.async('text')
    const declaration = xml2js.xml2js(contentXml, { compact: true }) as JeopardyDeclaration.Pack

    return {
        author: getPrimaryAuthor(declaration),
        dateCreated: declaration.package._attributes.date,
        declaration,
        packName: declaration.package._attributes.name
    }
}

export function getAllThemes(declaration: JeopardyDeclaration.Pack): string[] {
    return getRounds(declaration).reduce((acc, round) => [...acc, ...getThemes(round).map(theme => theme._attributes.name)], [] as string[])
}

export function getNonFinalThemes(declaration: JeopardyDeclaration.Pack): string[] {
    return getRounds(declaration).reduce(
        (acc, round) => (isFinalRoundType(round._attributes.type) ? acc : [...acc, ...getThemes(round).map(theme => theme._attributes.name)]),
        [] as string[]
    )
}

export function isFinalRound(declaration: JeopardyDeclaration.Pack, roundId: number): boolean {
    return isFinalRoundType(getRounds(declaration)[roundId]?._attributes.type)
}

export function getFinalThemes(declaration: JeopardyDeclaration.Pack): string[] {
    return getRounds(declaration).reduce(
        (acc, round) => (isFinalRoundType(round._attributes.type) ? [...acc, ...getThemes(round).map(theme => theme._attributes.name)] : acc),
        [] as string[]
    )
}

export function getRoundThemeNames(
    declaration: JeopardyDeclaration.Pack,
    roundId: number
): {
    isFinalRound: boolean
    roundName: string
    themeNames: string[]
} | null {
    const round = getRounds(declaration)[roundId]

    if (!round) {
        return null
    }

    return {
        isFinalRound: isFinalRoundType(round._attributes.type),
        roundName: round._attributes.name,
        themeNames: getThemes(round).map(theme => theme._attributes.name)
    }
}

export function getRoundThemesCount(declaration: JeopardyDeclaration.Pack, roundId: number): number | null {
    const round = getRounds(declaration)[roundId]

    if (!round) {
        return null
    }

    return getThemes(round).length
}

export function getRoundsCount(declaration: JeopardyDeclaration.Pack): number {
    return getRounds(declaration).length
}

export function getRoundQuestions(declaration: JeopardyDeclaration.Pack, roundId: number): RealtimeJeopardyQuestionId[] | null {
    const round = getRounds(declaration)[roundId]

    if (!round) {
        return null
    }

    return getThemes(round).reduce(
        (questions, theme, themeIndex) => [
            ...questions,
            ...getQuestions(theme).map((_, questionIndex) => `${roundId}-${themeIndex}-${questionIndex}` as RealtimeJeopardyQuestionId)
        ],
        [] as RealtimeJeopardyQuestionId[]
    )
}

export function getRoundQuestionViewData(
    declaration: JeopardyDeclaration.Pack,
    roundId: number
):
    | {
          name: string
          question: {
              price: string
              questionId: RealtimeJeopardyQuestionId
          }[]
          themeId: RealtimeJeopardyThemeId
      }[]
    | null {
    const round = getRounds(declaration)[roundId]

    if (!round) {
        return null
    }

    return getThemes(round).map((theme, themeIndex) => ({
        name: theme._attributes.name,
        question: getQuestions(theme).map((question, questionIndex) => ({
            price: question._attributes.price,
            questionId: `${roundId}-${themeIndex}-${questionIndex}` as RealtimeJeopardyQuestionId
        })),
        themeId: `${roundId}-${themeIndex}` as RealtimeJeopardyThemeId
    }))
}

export function getQuestionById(declaration: JeopardyDeclaration.Pack, id: RealtimeJeopardyQuestionId): JeopardyDeclaration.Question | null {
    const [roundId, themeId, questionId] = id.split('-').map(value => Number(value))

    if (![roundId, themeId, questionId].every(Number.isInteger)) {
        return null
    }

    return getQuestions(getThemes(getRounds(declaration)[roundId])[themeId])[questionId] || null
}

export function getNormalizedQuestionById(declaration: JeopardyDeclaration.Pack, id: RealtimeJeopardyQuestionId): NormalizedJeopardyQuestion | null {
    const question = getQuestionById(declaration, id)

    if (!question) {
        return null
    }

    const price = Number(question._attributes.price)
    const normalizedType = normalizeLegacyQuestionType(question)
    const params = getParamMap(question)
    const paramQuestionItems = extractContentItemsFromParam(params.get('question'))
    const paramAnswerItems = extractContentItemsFromParam(params.get('answer'))
    const [scenarioQuestionItems, scenarioAnswerItems] = extractScenarioItems(question)
    const questionItems = paramQuestionItems.length ? paramQuestionItems : scenarioQuestionItems
    const answerItems = paramAnswerItems.length ? paramAnswerItems : scenarioAnswerItems
    const correctAnswers = arrayedOrEmpty(question.right?.answer)
        .map(answer => answer._text || '')
        .filter(Boolean)
    const incorrectAnswers = arrayedOrEmpty(question.wrong?.answer)
        .map(answer => answer._text || '')
        .filter(Boolean)
    const fallbackAnswerItems =
        answerItems.length || !correctAnswers.length
            ? answerItems
            : [
                  {
                      content: correctAnswers.join(','),
                      durationMs: null,
                      isRef: false,
                      placement: 'screen' as const,
                      type: 'text' as const,
                      waitForFinish: true
                  }
              ]
    const answerDurationValue = Number(getParamText(params.get('answerDuration')))

    return {
        answerDurationMs: Number.isFinite(answerDurationValue) && answerDurationValue > 0 ? answerDurationValue * 1000 : null,
        answerItems: fallbackAnswerItems,
        correctAnswers,
        incorrectAnswers,
        isNoRisk: normalizedType.isNoRisk,
        price,
        priceMultiplier: normalizedType.priceMultiplier,
        priceOptions: extractPriceOptions(question, price),
        questionItems,
        questionTheme: normalizedType.questionTheme,
        selectionMode: normalizedType.selectionMode,
        type: normalizedType.type
    }
}

export function getQuestionScenarioById(
    declaration: JeopardyDeclaration.Pack,
    id: RealtimeJeopardyQuestionId
): null | [NormalizedJeopardyContentItem[], NormalizedJeopardyContentItem[]] {
    const question = getNormalizedQuestionById(declaration, id)

    if (!question) {
        return null
    }

    return [question.questionItems, question.answerItems]
}

export function getAnswers(declaration: JeopardyDeclaration.Pack, questionId: RealtimeJeopardyQuestionId): [string[], string[]] | null {
    const question = getNormalizedQuestionById(declaration, questionId)

    if (!question) {
        return null
    }

    return [question.correctAnswers, question.incorrectAnswers]
}
