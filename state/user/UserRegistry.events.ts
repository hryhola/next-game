export type Events = {
    'UserRegistry-OnlineUpdate': {
        scope: 'global'
        list: { nickname: string; id: string }[]
    }
}
