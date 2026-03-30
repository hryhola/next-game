import type { LobbyGameFeature, LobbyGameContext } from './game-contract'
import type { RealtimeLobbyGameName } from '../../../shared/contracts/realtime-lobby'
import { createClickerGameFeature } from '../games/clicker/definition'
import { createJeopardyGameFeature } from '../games/jeopardy/definition'
import { createTicTacToeGameFeature } from '../games/tictactoe/definition'

type LobbyGameFactory = (ctx: LobbyGameContext) => LobbyGameFeature

const gameFactories: Record<RealtimeLobbyGameName, LobbyGameFactory> = {
    Clicker: createClickerGameFeature,
    Jeopardy: createJeopardyGameFeature,
    TicTacToe: createTicTacToeGameFeature
}

export class LobbyGameRegistry {
    constructor(private readonly ctx: LobbyGameContext) {}

    resolve(kind: RealtimeLobbyGameName): LobbyGameFeature {
        const factory = gameFactories[kind]

        if (!factory) {
            throw new Error(`Unsupported room game kind: ${kind}`)
        }

        return factory(this.ctx)
    }
}
