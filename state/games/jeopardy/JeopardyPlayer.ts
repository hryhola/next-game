import { Player } from 'state'

export class JeopardyPlayer extends Player {
    state = {
        score: 0,
        isMaster: false
    }

    update(newState: Partial<typeof this.state>) {
        super.update(newState)
    }

    data() {
        return {
            ...this.member.data(),
            ...this.state
        }
    }
}

export type ClickerPlayerData = ReturnType<JeopardyPlayer['data']>
