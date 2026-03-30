import type { LobbyData, TChatMessage, UserData } from 'state'

const avatarDataUrl =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' rx='60' fill='%238b5cf6'/%3E%3Ctext x='60' y='70' font-size='42' text-anchor='middle' fill='white' font-family='Arial'%3EN%3C/text%3E%3C/svg%3E"

export const storybookUser: UserData = {
    id: 'user-nova',
    userNickname: 'Nova',
    userColor: '#c084fc',
    userAvatarUrl: avatarDataUrl,
    userIsOnline: true
}

export const storybookGuestUser: UserData = {
    ...storybookUser,
    id: 'user-sage',
    userNickname: 'Sage',
    userColor: '#f0abfc',
    userAvatarUrl: undefined
}

export const storybookLobby: LobbyData = {
    id: 'aurora-room',
    private: false,
    gameName: 'Jeopardy',
    creator: {
        ...storybookUser
    },
    members: [
        {
            ...storybookUser,
            memberIsCreator: true,
            memberIsPlayer: true,
            memberPosition: 0,
            memberRole: 'player'
        },
        {
            id: 'user-sage',
            userNickname: 'Sage',
            userColor: '#f0abfc',
            userAvatarUrl: undefined,
            userIsOnline: true,
            memberIsCreator: false,
            memberIsPlayer: true,
            memberPosition: 1,
            memberRole: 'player'
        },
        {
            id: 'user-rho',
            userNickname: 'Rho',
            userColor: '#a78bfa',
            userAvatarUrl: undefined,
            userIsOnline: true,
            memberIsCreator: false,
            memberIsPlayer: false,
            memberPosition: 2,
            memberRole: 'spectator'
        }
    ],
    readyCheck: null
}

export const storybookPrivateLobby: LobbyData = {
    ...storybookLobby,
    id: 'violet-vault',
    private: true
}

export const storybookChatMessages: TChatMessage[] = [
    {
        id: 'message-1',
        from: 'Nova',
        fromColor: '#c084fc',
        text: 'Lobby is live. Jeopardy pack is loaded and ready.'
    },
    {
        id: 'message-2',
        from: 'Sage',
        fromColor: '#f0abfc',
        text: 'I can take the first round if nobody minds.'
    },
    {
        id: 'message-3',
        from: 'Rho',
        fromColor: '#a78bfa',
        text: 'Lets test the direct join flow from a shared link too.'
    }
]
