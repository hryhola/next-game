import { ClickerPlayer } from './ClickerPlayer'

export class ClickerSessionState {
    isClickAllowed: boolean = false
    winner: ClickerPlayer | null = null
}
