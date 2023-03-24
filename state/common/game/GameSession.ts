import logger from 'logger'
import { Game, Player } from 'state'
import { GeneralSuccess, GeneralFailure } from 'util/t'

export type SessionStartData = Record<string, string>

export type GameActor = {
    type: 'player' | 'game'
    id: string
}

export type GameAction = {
    type: string
    payload: any
    result: any
    by: GameActor
}

export abstract class GameSession {
    game: Game
    log: GameAction[] = []

    abstract state: any

    constructor(game: Game) {
        this.game = game
    }

    action(by: Player | Game, type: string, payload: any): GeneralSuccess | GeneralFailure {
        if (!type) {
            const message = 'Action type is missing'

            logger.error({ payload }, message)

            return {
                success: false,
                message
            }
        }

        const handlerName = '$' + type

        if (!(handlerName in this)) {
            const message = `Handler for type '${type.toString()}' is missing`

            logger.error({ payload }, message)

            return {
                success: false,
                message
            }
        }

        const actionHandler = this[handlerName as keyof this]

        if (typeof actionHandler !== 'function') {
            const message = `Handler for type '${type.toString()}' is missing`

            logger.error({ payload })

            return {
                success: false,
                message
            }
        }

        const result = actionHandler.call(this, by, payload)

        const action: GameAction = {
            type,
            payload,
            result,
            by: {
                type: by instanceof Game ? 'game' : 'player',
                id: by instanceof Game ? 'game' : by.member.user.id
            }
        }

        this.log.push(action)

        this.game.lobby.publish('Game-SessionAction', {
            ...action,
            lobbyId: this.game.lobby.id
        })

        return {
            success: true
        }
    }

    abstract data(): object
}
