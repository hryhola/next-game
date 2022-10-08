import { Chat, Room } from 'model'

export class AppState {
    globalChat = new Chat()
    rooms: Record<string, Room> = {}
}
