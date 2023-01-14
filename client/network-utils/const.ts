export const URL = {
    get WS() {
        if (window.location.protocol.includes('https')) {
            return `wss://${location.host}/ws/`
        } else {
            return `ws://${location.hostname}:5555/ws`
        }
    },
    get SocketStartStarter() {
        if (location.protocol.includes('https')) {
            return `https://${location.host}/api/init`
        } else {
            return `http://${location.hostname}:3000/api/init`
        }
    }
}
