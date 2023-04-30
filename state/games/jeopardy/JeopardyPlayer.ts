import { Player } from 'state'

interface JeopardyPlayerState {}

export class JeopardyPlayer extends Player<JeopardyPlayerState> {}

export type ClickerPlayerData = ReturnType<JeopardyPlayer['data']>
