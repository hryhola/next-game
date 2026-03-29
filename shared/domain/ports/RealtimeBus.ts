import type { SocketMessage, StateEventName, StateEvents } from '../../contracts'

export interface RealtimeBus {
    publish(channel: string, message: SocketMessage): void
    publishTopicEvent<C extends StateEventName>(channel: C, message: StateEvents[C]): void
}
