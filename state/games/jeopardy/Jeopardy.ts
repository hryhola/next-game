import { Lobby } from '../../lobby/Lobby'
import { LobbyMember } from '../../lobby/LobbyMember'

export class JeopardyMember extends LobbyMember {
    isMaster: boolean = false
}

export class Jeopardy extends Lobby {}
