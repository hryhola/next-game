export const URL = {
    get WS() {
        if (window.location.protocol.includes('https')) {
            return `wss://${location.host}/ws/`
        } else {
            return `ws://${location.hostname}:${process.env.NEXT_PUBLIC_WS_PORT}/ws`
        }
    },
    get SocketStartStarter() {
        if (location.protocol.includes('https')) {
            return `https://${location.host}/api/init`
        } else {
            return `http://${location.hostname}:3000/api/init`
        }
    },
    get Profile() {
        if (location.protocol.includes('https')) {
            return `https://${location.host}/api/profile`
        } else {
            return `http://${location.hostname}:3000/api/profile`
        }
    },
    get Lobby() {
        if (location.protocol.includes('https')) {
            return `https://${location.host}/api/lobby`
        } else {
            return `http://${location.hostname}:3000/api/lobby`
        }
    },
    get LobbyJoin() {
        if (location.protocol.includes('https')) {
            return `https://${location.host}/api/lobby-join`
        } else {
            return `http://${location.hostname}:3000/api/lobby-join`
        }
    }
}
