import { ClickerPlayer } from './ClickerPlayer'

export class ClickerSessionState {
    playerIsClickAllowed: boolean = false
    winner: ClickerPlayer | null = null
}
