export namespace JeopardyState {
    export interface PackThemesPreviewFrame {
        id: 'pack-themes-preview'
        packName: string
        author: string
        dateCreated: string
        themes: string[]
    }

    export interface RoundPreviewFrame {
        id: 'rounds-preview'
        text: string
        isRoundName: boolean
    }

    export interface PickQuestionFrame {
        id: 'pick-question'
        pickerId: string
        roundId: number
        themes: {
            themeId: `${number}-${number}` // round index + theme index
            name: string
            question: {
                questionId: `${number}-${number}-${number}` // round index + theme index + question index
                price: string
                isAnswered: boolean
            }[]
        }[]
    }

    export type Frame = { id: 'none' } | PackThemesPreviewFrame | RoundPreviewFrame | PickQuestionFrame
}

export type JeopardySessionState = {
    internal: {
        answeredQuestions: string[]
    }
    frame: JeopardyState.Frame
}
