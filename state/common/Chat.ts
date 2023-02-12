import { State } from '../AppState'

export interface TChatMessage {
    id: string
    from: string
    fromColor?: string
    text: string
}

export class Chat {
    /**
     * @description Chat id (lobby id or 'global')
     */
    readonly id: string
    readonly isGlobal: boolean

    private messages: TChatMessage[] = []

    limit?: number

    constructor(id: string, limit?: number, isGlobal: boolean = false) {
        this.id = id
        this.limit = limit
        this.isGlobal = isGlobal
    }

    addMessage(message: TChatMessage) {
        this.messages.push(message)

        if (this.limit) {
            this.messages = this.messages.slice(-this.limit)
        }

        if (this.isGlobal) {
            State.res.publishGlobal('Chat-NewMessage', {
                scope: 'global',
                message: message
            })
        } else {
            State.res.publish('Lobby-' + this.id, {
                ctx: 'Chat-NewMessage',
                data: {
                    scope: 'lobby',
                    lobbyId: this.id,
                    message: message
                }
            })
        }
    }

    getMessages(limit?: number) {
        if (limit) {
            return this.messages.slice(-limit)
        }

        return this.messages
    }

    data() {
        return {
            id: this.id,
            messages: this.messages
        }
    }
}
