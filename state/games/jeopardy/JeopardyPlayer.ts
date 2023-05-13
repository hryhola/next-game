import { Player } from 'state'

interface JeopardyPlayerState {}

export class JeopardyPlayer extends Player<JeopardyPlayerState> {}

export type JeopardyPlayerData = ReturnType<JeopardyPlayer['data']>
