import { Lobby, LobbyMember } from './Lobby'

export class JeopardyMember extends LobbyMember {
    isMaster: boolean = false
}

export class Jeopardy extends Lobby {}

export type TJeopardyMember = ExcludeMethods<JeopardyMember>
