import { GameSession } from 'state/common/game/GameSession'
import { Jeopardy } from './Jeopardy'
import { JeopardySessionState } from './JeopardySessionState'

export class JeopardySession extends GameSession {
    state: JeopardySessionState

    constructor(game: Jeopardy) {
        super(game)

        this.state = new JeopardySessionState()
    }

    data() {
        return {}
    }
}

export type ClickerSessionData = ReturnType<JeopardySession['data']>
