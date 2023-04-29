import logger from 'logger'
import { Game, Player } from 'state'
import { GeneralSuccess, GeneralFailure } from 'util/universalTypes'

export type GameActor = {
    type: 'player' | 'game'
    id: string
}

export type GameAction<T extends string | number | symbol = string, P = any, R = any> = {
    type: T
    payload: P
    result: R
    actor: GameActor
}

export abstract class GameSession {
    game: Game
    log: GameAction[] = []

    abstract state: any

    constructor(game: Game) {
        this.game = game
    }

    action(actor: Player | Game, type: string, payload: any = {}, eventOptions: GameSessionActionHandlerEventOptions): GeneralSuccess | GeneralFailure {
        if (!type) {
            const message = 'Action type is missing'

            logger.error({ payload }, message)

            return {
                success: false,
                message
            }
        }

        if (typeof type !== 'string' || type[0] !== '$') {
            const message = `Action type '${type.toString()}' is invalid`

            logger.error({ payload }, message)

            return {
                success: false,
                message
            }
        }

        if (!(type in this)) {
            const message = `Handler for type '${type.toString()}' is missing`

            logger.error({ payload }, message)

            return {
                success: false,
                message
            }
        }

        const actionHandler = this[type as keyof this] as GameSessionActionHandler | null

        if (typeof actionHandler !== 'function') {
            const message = `Handler for type '${type.toString()}' is missing`

            logger.error({ payload })

            return {
                success: false,
                message
            }
        }

        const result = actionHandler.call(this, actor, payload, eventOptions)

        const action: GameAction = {
            type,
            payload,
            result,
            actor: {
                type: actor instanceof Game ? 'game' : 'player',
                id: actor instanceof Game ? 'game' : actor.member.user.id
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

export type GameSessionActionHandlerEventOptions = {
    complete: () => any
}

export type GameSessionActionHandler = (
    actor: Player | Game,
    payload: any,
    eventOptions: GameSessionActionHandlerEventOptions
) => GeneralSuccess | GeneralFailure

export type A = Parameters<GameSessionActionHandler>[0]
export type P = Parameters<GameSessionActionHandler>[1]
export type E = Parameters<GameSessionActionHandler>[2]

export type GameSessionActionsName<GS extends GameSession> = Exclude<keyof GS, Exclude<keyof GS, `$${string}`>>

export type GameSessionAction<GS extends GameSession, ActionName extends GameSessionActionsName<GS> = GameSessionActionsName<GS>> = GameAction<
    ActionName,
    // @ts-ignore
    Parameters<GS[ActionName]>[1],
    // @ts-ignore
    ReturnType<GS[ActionName]>
>

export type GameSessionData = object
