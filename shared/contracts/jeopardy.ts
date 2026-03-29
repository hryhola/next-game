export namespace JeopardyDeclaration {
    export interface QuestionScenarioAtomVideo {
        _attributes: {
            type: 'video'
        }
        _text: `@${string}.${string}"`
    }

    export interface QuestionScenarioAtomVoice {
        _attributes: {
            type: 'voice'
        }
        _text: `@${string}.${string}"`
    }

    export interface QuestionScenarioAtomImage {
        _attributes: {
            type: 'image'
        }
        _text: `@${string}.${string}"`
    }

    export interface QuestionScenarioAtomText {
        _text: string
    }

    export interface QuestionScenarioAtomMarker {
        _attributes: {
            type: 'marker'
        }
    }

    export type QuestionScenarioContentAtom = QuestionScenarioAtomImage | QuestionScenarioAtomVoice | QuestionScenarioAtomVideo | QuestionScenarioAtomText
    export type QuestionScenarioAtom = QuestionScenarioContentAtom | QuestionScenarioAtomMarker

    export interface QuestionScenario {
        atom: QuestionScenarioAtom | QuestionScenarioAtom[]
    }

    export interface QuestionAnswer {
        _text: string
    }

    export interface Question {
        _attributes: {
            price: `${number}`
        }
        scenario: QuestionScenario
        right: {
            answer: QuestionAnswer | QuestionAnswer[]
        }
        wrong?: {
            answer: QuestionAnswer | QuestionAnswer[]
        }
    }

    export interface Theme {
        _attributes: {
            name: string
        }
        questions: {
            question: Question[] | Question
        }
    }

    export interface Round {
        _attributes: {
            name: string
            type?: 'final'
        }
        themes: {
            theme: Theme[] | Theme
        }
    }

    export interface Pack {
        _declaration: {
            _attributes: {
                version: `${number}.${number}`
                encoding: string
            }
        }
        package: {
            _attributes: {
                name: string
                version: `${number}`
                id: string
                date: `${number}.${number}.${number}`
                difficulty: `${number}.${number}`
                logo: `@${string}.${string}`
                xmlns: string
            }
            info: {
                authors: {
                    author: {
                        _text: string
                    }
                }
            }
            rounds: {
                round: Round[] | Round
            }
        }
    }
}

export type RealtimeJeopardyQuestionId = `${number}-${number}-${number}`
export type RealtimeJeopardyThemeId = `${number}-${number}`

export interface RealtimeJeopardyWinner {
    id: string
    playerIsMaster: boolean
    playerScore: number
    userAvatarUrl?: string
    userColor?: string
    userIsOnline: boolean
    userNickname: string
}

export namespace RealtimeJeopardyState {
    export interface PackPreviewFrame {
        author: string
        dateCreated: string
        id: 'pack-preview'
        packName: string
        themes: string[]
    }

    export interface RoundPreviewFrame {
        id: 'rounds-preview'
        isRoundName: boolean
        text: string
    }

    export interface QuestionBoardFrame {
        id: 'question-board'
        pickedQuestion?: RealtimeJeopardyQuestionId
        pickerId: string
        roundId: number
        themes: {
            name: string
            question: {
                isAnswered: boolean
                price: string
                questionId: RealtimeJeopardyQuestionId
            }[]
            themeId: RealtimeJeopardyThemeId
        }[]
    }

    export interface QuestionContentFrame {
        answerGivingEndsAt?: string | null
        answerGivingStartedAt?: string | null
        answerGivingTimeLeft: number | null
        answerRequestEndsAt?: string | null
        answerRequestStartedAt?: string | null
        answerRequestTimeLeft: number | null
        answerVerifyingEndsAt?: string | null
        answerVerifyingStartedAt?: string | null
        answerVerifyingTimeLeft: number | null
        answeringPlayerId: string | null
        answeringStatus: 'too-early' | 'allowed' | 'answering' | 'answer-verifying' | 'too-late'
        content: string
        elapsedMediaTimeMs?: number
        id: 'question-content'
        mediaStartedAt?: string | null
        playersOnCooldown: string[]
        playersWhoAnswered: string[]
        questionId: RealtimeJeopardyQuestionId
        result?: 'approved' | 'declined'
        skipVoted: string[]
        type: 'text' | 'voice' | 'video' | 'image'
    }

    export interface FinalScoreFrame {
        id: 'final-score'
        winner: RealtimeJeopardyWinner
    }

    export interface FinalRoundBoardFrame {
        id: 'final-round-board'
        playersThatAnswered: string[]
        playersThatMadeBet: string[]
        questionAtoms?: {
            content: string
            type?: 'text' | 'voice' | 'video' | 'image'
        }[]
        skipperId: string | null
        status: 'skipping' | 'betting' | 'answering' | 'answer-verifying'
        themes: {
            name: string
            skipped: boolean
        }[]
    }

    export type Frame =
        | { id: 'none' }
        | PackPreviewFrame
        | RoundPreviewFrame
        | QuestionBoardFrame
        | QuestionContentFrame
        | FinalRoundBoardFrame
        | FinalScoreFrame
}

export interface RealtimeJeopardySessionInternal {
    answerIsApproved?: boolean | null
    answeredQuestions: string[]
    correctAnswers?: string[] | null
    currentAnsweringPlayerAnswerText?: string | null
    currentAnsweringPlayerId: string | null
    currentRoundId: number
    finalAnswers: {
        [userId: string]: {
            rate?: 'approved' | 'declined'
            value: string
        }
    }
    finalBets: {
        [userId: string]: number
    }
    incorrectAnswers?: string[] | null
    pickerId: string | null
}

export interface RealtimeJeopardySessionState {
    frame: RealtimeJeopardyState.Frame
    internal: RealtimeJeopardySessionInternal
    isPaused: boolean
}

export type RealtimeJeopardyPublicSession = Omit<RealtimeJeopardySessionState, 'internal'>

export interface RealtimeJeopardyPackInitialData {
    pack: {
        public: true
        value: string
    }
}
