import { AbstractPlayer } from 'state'

export class ClickerPlayer extends AbstractPlayer {}

export type ClickerPlayerData = ReturnType<ClickerPlayer['data']>
