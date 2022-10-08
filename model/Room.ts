import { User } from 'model'

export class Room {
    id: string
    users: User[] = []
    password?: string

    constructor(id: string) {
        this.id = id
    }
}
