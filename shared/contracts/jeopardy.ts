export namespace JeopardyDeclaration {
    export type ContentPlacement = 'background' | 'replic' | 'screen'
    export type ContentType = 'audio' | 'html' | 'image' | 'marker' | 'say' | 'text' | 'video' | 'voice'

    export interface ContentItem {
        _attributes?: {
            duration?: string
            isRef?: 'False' | 'True' | boolean
            placement?: ContentPlacement
            type?: ContentType
            waitForFinish?: 'False' | 'True' | boolean
        }
        _cdata?: string
        _text?: string
    }

    export interface LegacyQuestionTypeParam {
        _attributes: {
            name: string
        }
        _text?: string
    }

    export interface LegacyQuestionType {
        _attributes?: {
            name?: string
        }
        _text?: string
        param?: LegacyQuestionTypeParam | LegacyQuestionTypeParam[]
    }

    export interface NumberSet {
        _attributes: {
            maximum?: `${number}` | string
            minimum?: `${number}` | string
            step?: `${number}` | string
        }
    }

    export interface QuestionParameter {
        _attributes: {
            name: string
            type?: string
        }
        _cdata?: string
        _text?: string
        item?: ContentItem | ContentItem[]
        numberSet?: NumberSet
        param?: QuestionParameter | QuestionParameter[]
    }

    export interface QuestionScenario {
        atom: ContentItem | ContentItem[]
    }

    export interface QuestionAnswer {
        _text?: string
    }

    export interface QuestionScriptStepParam {
        _attributes: {
            isRef?: 'False' | 'True' | boolean
            name: string
            type?: string
        }
        _text?: string
    }

    export interface QuestionScriptStep {
        _attributes: {
            type: string
        }
        param?: QuestionScriptStepParam | QuestionScriptStepParam[]
    }

    export interface Question {
        _attributes: {
            price: `${number}`
            type?: string
        }
        params?: {
            param: QuestionParameter | QuestionParameter[]
        }
        right: {
            answer: QuestionAnswer | QuestionAnswer[]
        }
        scenario?: QuestionScenario
        script?: {
            step: QuestionScriptStep | QuestionScriptStep[]
        }
        type?: LegacyQuestionType
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
            type?: 'final' | 'themeList' | string
        }
        themes: {
            theme: Theme[] | Theme
        }
    }

    export interface Pack {
        _declaration: {
            _attributes: {
                encoding: string
                version: `${number}.${number}`
            }
        }
        package: {
            _attributes: {
                date: `${number}.${number}.${number}`
                difficulty: `${number}.${number}` | string
                id: string
                logo?: `@${string}.${string}` | string
                name: string
                version: `${number}` | string
                xmlns: string
            }
            info?: {
                authors?: {
                    author:
                        | {
                              _text: string
                          }[]
                        | {
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

export type RealtimeJeopardyQuestionType =
    | 'custom'
    | 'forAll'
    | 'forYourself'
    | 'noRisk'
    | 'secret'
    | 'secretNoQuestion'
    | 'secretPublicPrice'
    | 'simple'
    | 'stake'
    | 'stakeAll'

export type RealtimeJeopardyQuestionPhase =
    | 'choosing-price'
    | 'making-hidden-stakes'
    | 'making-stake'
    | 'question-verifying'
    | 'selecting-player'
    | 'showing-answer'
    | 'showing-question'
    | 'waiting-to-start'

export type RealtimeJeopardyContentPlacement = 'background' | 'replic' | 'screen'

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
        answeringStatus: 'allowed' | 'answer-verifying' | 'answering' | 'too-early' | 'too-late'
        content: string
        contentPlacement?: RealtimeJeopardyContentPlacement
        eligiblePlayerIds?: string[]
        elapsedMediaTimeMs?: number
        id: 'question-content'
        isRef?: boolean
        mediaStartedAt?: string | null
        phaseEndsAt?: string | null
        phaseStartedAt?: string | null
        phaseTimeLeft?: number | null
        playersOnCooldown: string[]
        playersThatMadeBet?: string[]
        playersWhoAnswered: string[]
        priceOptions?: number[]
        questionId: RealtimeJeopardyQuestionId
        questionPrice?: number | null
        questionTheme?: string | null
        questionType?: RealtimeJeopardyQuestionType
        result?: 'approved' | 'declined'
        selectedPlayerId?: string | null
        skipVoted: string[]
        specialPhase?: RealtimeJeopardyQuestionPhase | null
        type: 'html' | 'image' | 'text' | 'video' | 'voice'
    }

    export interface FinalScoreFrame {
        id: 'final-score'
        winner: RealtimeJeopardyWinner
    }

    export interface FinalRoundBoardFrame {
        id: 'final-round-board'
        phaseEndsAt?: string | null
        phaseStartedAt?: string | null
        phaseTimeLeft?: number | null
        playersThatAnswered: string[]
        playersThatMadeBet: string[]
        questionAtoms?: {
            content: string
            isRef?: boolean
            placement?: RealtimeJeopardyContentPlacement
            type?: 'html' | 'image' | 'text' | 'video' | 'voice'
        }[]
        skipperId: string | null
        status: 'answer-verifying' | 'answering' | 'betting' | 'skipping'
        themes: {
            name: string
            skipped: boolean
        }[]
    }

    export type Frame =
        | { id: 'none' }
        | FinalRoundBoardFrame
        | FinalScoreFrame
        | PackPreviewFrame
        | QuestionBoardFrame
        | QuestionContentFrame
        | RoundPreviewFrame
}

export interface RealtimeJeopardySessionInternal {
    answerIsApproved?: boolean | null
    answeredQuestions: string[]
    correctAnswers?: string[] | null
    currentAnsweringPlayerAnswerText?: string | null
    currentAnsweringPlayerId: string | null
    currentQuestionAnswers?: {
        [userId: string]: {
            rate?: 'approved' | 'declined'
            value: string
            wager?: number
        }
    }
    currentQuestionBets?: {
        [userId: string]: number
    }
    currentQuestionPrice?: number | null
    currentQuestionSelectedPlayerId?: string | null
    currentQuestionVerificationQueue?: string[]
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
