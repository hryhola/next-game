import { WebSocket } from 'uWebSockets.js'

import { state } from '../../state'

export const login = (ws: WebSocket, data: { username: string }) => {
    if (state.users.some(u => u.id === data.username)) {
        const data = JSON.stringify({
            ctx: 'login',
            data: {
                success: false,
                message: 'User exists'
            }
        })

        ws.send(data)

        return
    }

    state.users.push({ id: data.username })

    ws.send(
        JSON.stringify({
            ctx: 'login',
            data: {
                username: data.username,
                success: true
            }
        })
    )

    ws.publish(
        'global-online',
        JSON.stringify({
            onlineUsersCount: state.users.length
        })
    )
}
