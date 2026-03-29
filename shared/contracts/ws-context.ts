export const WSRequestContexts = [
    'Auth-Login',
    'Auth-Logout',
    'Auth-Register',
    'Chat-Get',
    'Chat-Send',
    'Game-SendAction',
    'Game-Start',
    'Lobby-GetList',
    'Lobby-GetPublicInfo',
    'Lobby-Kick',
    'Lobby-StartReadyCheck',
    'Lobby-Tip',
    'ReadyCheck-Response',
    'Universal-Subscription',
    'Users-Get',
    'Users-GetCount'
] as const

export type WSRequestContext = typeof WSRequestContexts[number]
