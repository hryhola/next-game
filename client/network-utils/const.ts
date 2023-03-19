export const URL = {
    get WS() {
        if (window.location.protocol.includes('https')) {
            return `wss://${location.host}/ws/`
        } else {
            return `ws://${location.hostname}:${process.env.NEXT_PUBLIC_WS_PORT}/ws`
        }
    },
    get SocketStartStarter() {
        return `${location.origin}/api/init`
    },
    get Profile() {
        return `${location.origin}/api/profile`
    },
    get LobbyCreate() {
        return `${location.origin}/api/lobby-create`
    },
    get LobbyJoin() {
        return `${location.origin}/api/lobby-join`
    },
    get LobbyLeave() {
        return `${location.origin}/api/lobby-leave`
    },
    get LobbyDestroy() {
        return `${location.origin}/api/lobby-destroy`
    }
}
