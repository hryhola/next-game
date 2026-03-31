export type WebSocketCallbacks = {
    onClose: (ws: WebSocket, event: CloseEvent) => void
    onOpen: (ws: WebSocket) => void
    onError: (ws: WebSocket, event: Event) => void
    pingMessage?: string
    url?: string
}
