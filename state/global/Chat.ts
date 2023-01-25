import { makeAutoObservable, reaction } from 'mobx'

export interface TChatMessage {
    id: string
    username: string
    text: string
}

export interface TChat {
    messages: TChatMessage[]
}

export class Chat implements TChat {
    messages: TChatMessage[] = []
    limit?: number

    constructor(limit?: number) {
        this.limit = limit

        makeAutoObservable(this)
    }

    addMessage(message: TChatMessage) {
        this.messages.push(message)

        if (this.limit) {
            this.messages = this.messages.slice(-this.limit)
        }
    }
}
