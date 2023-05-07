export namespace JeopardyState {
    export interface PackPreviewFrame {
        id: 'pack-preview'
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

    export interface ShowQuestionBoardFrame {
        id: 'question-board'
        pickerId: string
        pickedQuestion?: `${number}-${number}-${number}`
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

    export interface QuestionContentFrame {
        id: 'question-content'
        type: 'text' | 'voice' | 'video' | 'image'
        content: string
        answeringStatus: 'too-early' | 'allowed' | 'too-late'
        answerProgress: number | null
        skipVoted: string[]
        // TODO: mode
    }

    export type Frame = { id: 'none' } | PackPreviewFrame | RoundPreviewFrame | ShowQuestionBoardFrame | QuestionContentFrame
}

export type JeopardySessionState = {
    internal: {
        currentRoundId: number
        answeredQuestions: string[]
    }
    frame: JeopardyState.Frame
}
