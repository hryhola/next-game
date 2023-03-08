import { LobbyMemberData } from './LobbyMember'

export type Events = {
    'ReadyCheck-Start': {
        members: LobbyMemberData[]
    }
    'ReadyCheck-PlayerStatus': {
        nickname: string
        ready: boolean
    }
    'ReadyCheck-End': {
        status: 'success' | 'failed'
    }
}
