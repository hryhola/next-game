import type { RealtimeJeopardyQuestionId } from './jeopardy'
import type { TicTacToeCellCoords } from './realtime-lobby'

export type GameActor = {
    id: string
    type: 'game' | 'player'
}

export type GameActionMap = Record<
    string,
    {
        payload: unknown
        result: unknown
    }
>

export type GameActionName<TActions extends GameActionMap> = Extract<keyof TActions, string>

export type GameActionPayload<TActions extends GameActionMap, TName extends GameActionName<TActions>> = TActions[TName]['payload']

export type GameActionResult<TActions extends GameActionMap, TName extends GameActionName<TActions>> = TActions[TName]['result']

export type GameActionEvent<TName extends string = string, TPayload = unknown, TResult = unknown> = {
    actor: GameActor
    lobbyId: string
    payload: TPayload
    result: TResult
    type: TName
}

export type TypedGameActionEvent<TActions extends GameActionMap, TName extends GameActionName<TActions> = GameActionName<TActions>> = {
    [K in GameActionName<TActions>]: GameActionEvent<K, TActions[K]['payload'], TActions[K]['result']>
}[TName]

type SuccessResult = {
    success?: boolean
}

export type ClickerGameActionMap = {
    $Click: {
        payload: {
            x: number
            y: number
        }
        result: SuccessResult & {
            color: string
            status: 'Failure' | 'NotWin' | 'Ok' | 'Skipped'
        }
    }
    $ClickAllowed: {
        payload: Record<string, never>
        result: SuccessResult & {
            playerIsClickAllowed?: boolean
        }
    }
}

export type TicTacToeGameActionMap = {
    $Move: {
        payload: {
            cell: TicTacToeCellCoords
        }
        result: {
            isDraw: boolean
            nextTurn: string | null
            status: 'Success'
            winLine: TicTacToeCellCoords[] | null
            winner?: string
        }
    }
}

export type JeopardyGameActionMap = {
    $AnswerRequest: {
        payload: null
        result: SuccessResult & {
            isPlayerOnCooldown?: boolean
        }
    }
    $GiveAnswer: {
        payload: {
            text?: string | null
        }
        result: SuccessResult
    }
    $GiveFinalAnswer: {
        payload: {
            answer: string
        }
        result: SuccessResult
    }
    $MakeFinalBet: {
        payload: {
            value: number
        }
        result: SuccessResult
    }
    $MediaEnded: {
        payload: null
        result: SuccessResult
    }
    $Pause: {
        payload: null
        result: SuccessResult
    }
    $PickQuestion: {
        payload: {
            questionId: RealtimeJeopardyQuestionId
        }
        result: SuccessResult
    }
    $SelectQuestionPlayer: {
        payload: {
            playerId: string
        }
        result: SuccessResult
    }
    $RateAnswer: {
        payload: {
            rating: 'approved' | 'declined'
        }
        result: SuccessResult
    }
    $RateFinalAnswer: {
        payload: {
            answeringPlayerId: string
            rate: 'approved' | 'declined'
        }
        result: SuccessResult
    }
    $Resume: {
        payload: null
        result: SuccessResult
    }
    $RoundPreview: {
        payload: {
            roundId: number
        }
        result: SuccessResult
    }
    $SetScore: {
        payload: {
            playerID: string
            score: number
        }
        result: SuccessResult
    }
    $SetQuestionValue: {
        payload: {
            value: number
        }
        result: SuccessResult
    }
    $ShowFinalScores: {
        payload: null
        result: SuccessResult
    }
    $SkipFinalTheme: {
        payload: {
            themeIndex: number
        }
        result: SuccessResult
    }
    $SkipVote: {
        payload: null
        result: SuccessResult
    }
}
