import { AbstractPlayer } from 'state'

export class ClickerPlayer extends AbstractPlayer {
    state = {
        score: 0,
        isMaster: false,
        isClickAllowed: true
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

export type ClickerPlayerData = ReturnType<ClickerPlayer['data']>
