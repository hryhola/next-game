import JSZip from 'jszip'
import xml2js from 'xml-js'
import { JeopardyDeclaration, RealtimeJeopardyQuestionId, RealtimeJeopardyThemeId } from '../../../shared/contracts/jeopardy'
import { arrayed } from '../../../util/array'

export interface ParsedJeopardyPack {
    author: string
    dateCreated: string
    declaration: JeopardyDeclaration.Pack
    packName: string
}

export async function parseJeopardyPackArchive(archive: ArrayBuffer): Promise<ParsedJeopardyPack> {
    const zip = await new JSZip().loadAsync(archive)
    const contentXmlFile = zip.files['content.xml']

    if (!contentXmlFile) {
        throw new Error("Jeopardy pack is missing 'content.xml'")
    }

    const contentXml = await contentXmlFile.async('text')
    const declaration = xml2js.xml2js(contentXml, { compact: true }) as JeopardyDeclaration.Pack
    const author = declaration.package.info.authors.author._text

    return {
        author,
        dateCreated: declaration.package._attributes.date,
        declaration,
        packName: declaration.package._attributes.name
    }
}

export function getAllThemes(declaration: JeopardyDeclaration.Pack): string[] {
    const rounds = arrayed(declaration.package.rounds.round)

    return rounds.reduce((acc, round) => [...acc, ...arrayed(round.themes.theme).map(theme => theme._attributes.name)], [] as string[])
}

export function getNonFinalThemes(declaration: JeopardyDeclaration.Pack): string[] {
    return arrayed(declaration.package.rounds.round).reduce(
        (acc, round) => (round._attributes.type === 'final' ? acc : [...acc, ...arrayed(round.themes.theme).map(theme => theme._attributes.name)]),
        [] as string[]
    )
}

export function isFinalRound(declaration: JeopardyDeclaration.Pack, roundId: number): boolean {
    return arrayed(declaration.package.rounds.round)[roundId]?._attributes.type === 'final'
}

export function getFinalThemes(declaration: JeopardyDeclaration.Pack): string[] {
    return arrayed(declaration.package.rounds.round).reduce(
        (acc, round) => (round._attributes.type !== 'final' ? acc : [...acc, ...arrayed(round.themes.theme).map(theme => theme._attributes.name)]),
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
    const round = arrayed(declaration.package.rounds.round)[roundId]

    if (!round) {
        return null
    }

    return {
        isFinalRound: round._attributes.type === 'final',
        roundName: round._attributes.name,
        themeNames: arrayed(round.themes.theme).map(theme => theme._attributes.name)
    }
}

export function getRoundThemesCount(declaration: JeopardyDeclaration.Pack, roundId: number): number | null {
    const round = arrayed(declaration.package.rounds.round)[roundId]

    if (!round) {
        return null
    }

    return arrayed(round.themes.theme).length
}

export function getRoundsCount(declaration: JeopardyDeclaration.Pack): number {
    return arrayed(declaration.package.rounds.round).length
}

export function getRoundQuestions(declaration: JeopardyDeclaration.Pack, roundId: number): RealtimeJeopardyQuestionId[] | null {
    const round = arrayed(declaration.package.rounds.round)[roundId]

    if (!round) {
        return null
    }

    return arrayed(round.themes.theme).reduce(
        (questions, theme, themeIndex) => [
            ...questions,
            ...arrayed(theme.questions.question).map((_, questionIndex) => `${roundId}-${themeIndex}-${questionIndex}` as RealtimeJeopardyQuestionId)
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
    const round = arrayed(declaration.package.rounds.round)[roundId]

    if (!round) {
        return null
    }

    return arrayed(round.themes.theme).map((theme, themeIndex) => ({
        name: theme._attributes.name,
        question: arrayed(theme.questions.question).map((question, questionIndex) => ({
            price: question._attributes.price,
            questionId: `${roundId}-${themeIndex}-${questionIndex}` as RealtimeJeopardyQuestionId
        })),
        themeId: `${roundId}-${themeIndex}` as RealtimeJeopardyThemeId
    }))
}

export function getQuestionById(declaration: JeopardyDeclaration.Pack, id: RealtimeJeopardyQuestionId): JeopardyDeclaration.Question | null {
    const [roundId, themeId, questionId] = id.split('-')

    if (!roundId || !themeId || !questionId) {
        return null
    }

    return arrayed(arrayed(arrayed(declaration.package.rounds.round)[+roundId]?.themes.theme)[+themeId]?.questions.question)[+questionId] || null
}

export function getQuestionScenarioById(
    declaration: JeopardyDeclaration.Pack,
    id: RealtimeJeopardyQuestionId
): null | [JeopardyDeclaration.QuestionScenarioContentAtom[], JeopardyDeclaration.QuestionScenarioContentAtom[]] {
    const question = getQuestionById(declaration, id)

    if (!question) {
        return null
    }

    const atoms = arrayed(question.scenario.atom)
    const nonEmptyAtoms = atoms.filter(atom => Object.keys(atom).length)
    const beforeMarker: JeopardyDeclaration.QuestionScenarioContentAtom[] = []
    const afterMarker: JeopardyDeclaration.QuestionScenarioContentAtom[] = []

    let hadPassMarker = false

    for (let index = 0; index < nonEmptyAtoms.length; index += 1) {
        const atom = nonEmptyAtoms[index]

        if ('_attributes' in atom && atom._attributes.type === 'marker') {
            hadPassMarker = true
            continue
        }

        if (hadPassMarker) {
            afterMarker.push(atom as JeopardyDeclaration.QuestionScenarioContentAtom)
        } else {
            beforeMarker.push(atom as JeopardyDeclaration.QuestionScenarioContentAtom)
        }
    }

    if (!afterMarker.length) {
        afterMarker.push({
            _text: arrayed(question.right.answer)
                .map(answer => answer._text)
                .join(',')
        })
    }

    return [beforeMarker, afterMarker]
}

export function getAnswers(declaration: JeopardyDeclaration.Pack, questionId: RealtimeJeopardyQuestionId): [string[], string[]] | null {
    const question = getQuestionById(declaration, questionId)

    if (!question) {
        return null
    }

    if (!question.right.answer) {
        return [[], []]
    }

    const correct = arrayed(question.right.answer).map(answer => answer._text)

    if (!question.wrong) {
        return [correct, []]
    }

    const incorrect = arrayed(question.wrong.answer).map(answer => answer._text)

    return [correct, incorrect]
}
