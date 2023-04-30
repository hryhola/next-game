export type Events = {
    'UserRegistry-OnlineUpdate': {
        scope: 'global'
        list: { userNickname: string; id: string }[]
    }
}
