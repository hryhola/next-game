import { AbstractPlayer } from 'state/games/common/AbstractPlayer'

export class ClickerPlayer extends AbstractPlayer {}

export type ClickerPlayerData = ReturnType<ClickerPlayer['data']>
