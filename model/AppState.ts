import { Chat, Lobby, User } from 'model'

export class AppState {
    users: User[] = []
    globalChat = new Chat()
    lobbies: Record<string, Lobby> = {}
    auth: Record<string, User> = {}
}
