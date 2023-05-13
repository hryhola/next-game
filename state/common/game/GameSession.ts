import logger from 'logger'
import { Game, Player, User } from 'state'
import { Events } from 'state/common/game/Game.events'
import { GeneralSuccess, GeneralFailure, R, RecursivePartial } from 'util/universalTypes'
import { GameAndMasterOnlyActed } from './GameSession.decorators'

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

export abstract class GameSession<State extends { internal: any } = any> {
    game: Game
    log: GameAction[] = []

    abstract state: State

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

        if (actionHandler.nonPublished === true) {
            return {
                success: true
            }
        }

        const eventData: Events['Game-SessionAction'] = {
            ...action,
            lobbyId: this.game.lobby.id
        }

        if (actionHandler.publishingActorFilter) {
            const actors = this.game.players.filter(actionHandler.publishingActorFilter)

            actors.forEach(a =>
                a.member.user.ws.send(
                    JSON.stringify({
                        ctx: 'Game-SessionAction',
                        data: eventData
                    })
                )
            )

            return {
                success: true
            }
        }

        this.game.lobby.publish('Game-SessionAction', eventData)

        return {
            success: true
        }
    }

    @GameAndMasterOnlyActed
    $SetScore(_actor: A, payload: { playerID: string; score: number }, { complete }: E): R {
        const player = this.game.players.find(p => p.member.user.id === payload.playerID)

        if (!player) {
            complete()

            return {
                success: false,
                message: `Player with ID ${payload.playerID} not found in the game!`
            }
        }

        player.update({
            playerScore: Number(payload.score)
        })

        complete()

        return {
            success: true
        }
    }

    abstract data(user: User | Game): object

    update(data: Partial<State>) {
        Object.assign(this.state, data)

        if (Object.keys(data).length === 1 && 'internal' in data) {
            return
        }

        const { internal, ...publicData } = data

        this.game.publish('Game-SessionUpdate', {
            lobbyId: this.game.lobby.id,
            data: publicData
        })
    }
}

export type GameSessionActionHandlerEventOptions = {
    complete: () => any
}

export type GameSessionActionHandler = {
    nonPublished?: boolean
    publishingActorFilter?: (actor: A) => boolean
} & ((actor: Player | Game, payload: any, eventOptions: GameSessionActionHandlerEventOptions) => R)

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
