import type {
    LobbyBaseInfo,
    LobbyRoomGameActionMessage,
    RealtimeJeopardySessionInternal,
    RealtimeChatMessage,
    RealtimeLobbyGame,
    RealtimeLobbyListItem,
    RealtimeLobbyMember,
    RealtimeLobbySnapshot,
    RealtimeTicTacToeSession,
    StateEventName,
    StateEvents
} from 'shared/contracts'
import type { GameData, LobbyData, LobbyMemberData, PlayerData, TChatMessage } from 'shared/contracts/app'

export type AppEventEnvelope = {
    [E in StateEventName]: {
        ctx: E
        data: StateEvents[E]
    }
}[StateEventName]

type AppPlayerData = PlayerData & {
    playerChar?: RealtimeLobbyMember['playerChar']
    playerIsClickAllowed?: boolean
}

export function toAppChatMessage(message: RealtimeChatMessage): TChatMessage {
    return {
        id: message.id,
        from: message.from,
        fromColor: message.fromColor,
        text: message.text
    }
}

export function toAppChatMessages(messages: RealtimeChatMessage[]): TChatMessage[] {
    return messages.map(toAppChatMessage)
}

export function toAppLobbyMember(member: RealtimeLobbyMember, memberPosition: number): LobbyMemberData {
    return {
        id: member.id,
        memberIsCreator: member.isCreator,
        memberIsPlayer: member.role === 'player',
        memberPosition,
        memberRole: member.role,
        userColor: member.userColor,
        userIsOnline: member.connected,
        userNickname: member.userNickname,
        ...(member.userAvatarUrl
            ? {
                  userAvatarUrl: member.userAvatarUrl
              }
            : {})
    }
}

function toAppPlayer(member: RealtimeLobbyMember, memberPosition: number): PlayerData {
    const player: AppPlayerData = {
        ...toAppLobbyMember(member, memberPosition),
        playerIsMaster: member.playerIsMaster ?? member.isCreator,
        playerScore: member.playerScore ?? 0
    }

    if (member.playerChar) {
        player.playerChar = member.playerChar
    }

    if (typeof member.playerIsClickAllowed === 'boolean') {
        player.playerIsClickAllowed = member.playerIsClickAllowed
    }

    return player as PlayerData
}

function getAppMembers(snapshot: RealtimeLobbySnapshot): LobbyMemberData[] {
    return snapshot.members.map((member, index) => toAppLobbyMember(member, index))
}

function getAppPlayers(snapshot: RealtimeLobbySnapshot): PlayerData[] {
    return snapshot.members
        .map((member, index) => ({ member, index }))
        .filter(({ member }) => member.role === 'player')
        .map(({ member, index }) => toAppPlayer(member, index))
}

function getAppCreator(snapshot: RealtimeLobbySnapshot) {
    const creator = snapshot.members.find(member => member.isCreator) || snapshot.members[0]

    return creator
        ? {
              id: creator.id,
              userColor: creator.userColor,
              userIsOnline: creator.connected,
              userNickname: creator.userNickname,
              ...(creator.userAvatarUrl
                  ? {
                        userAvatarUrl: creator.userAvatarUrl
                    }
                  : {})
          }
        : {
              id: '',
              userColor: '',
              userIsOnline: false,
              userNickname: ''
          }
}

function toAppClickerWinner(snapshot: RealtimeLobbySnapshot, winnerUserId: string | null): PlayerData | undefined {
    if (!winnerUserId) {
        return undefined
    }

    const winnerIndex = snapshot.members.findIndex(member => member.id === winnerUserId && member.role === 'player')

    if (winnerIndex < 0) {
        return undefined
    }

    return toAppPlayer(snapshot.members[winnerIndex], winnerIndex)
}

function toAppActiveSession(
    game: RealtimeLobbyGame,
    snapshot: RealtimeLobbySnapshot,
    sessionInternal?: RealtimeJeopardySessionInternal | null
): GameData['session'] {
    if (game.name === 'Clicker') {
        if (game.session.status === 'idle') {
            return undefined
        }

        return {
            playerIsClickAllowed: game.session.playerIsClickAllowed,
            winner: toAppClickerWinner(snapshot, game.session.winnerUserId)
        }
    }

    if (game.name === 'Jeopardy') {
        if (!game.session) {
            return undefined
        }

        return sessionInternal
            ? {
                  ...game.session,
                  internal: sessionInternal
              }
            : {
                  ...game.session
              }
    }

    if (game.session.status !== 'active') {
        return undefined
    }

    return {
        board: game.session.board.map(row => [...row]),
        turn: game.session.turnUserId,
        winner: undefined
    }
}

function toAppEndedSession(previous: RealtimeLobbySnapshot, next: RealtimeLobbySnapshot): GameData['session'] {
    if (previous.game.name === 'Clicker') {
        return {
            playerIsClickAllowed: true,
            winner: toAppClickerWinner(next, previous.game.session.winnerUserId)
        }
    }

    if (previous.game.name === 'Jeopardy') {
        return previous.game.session
            ? {
                  ...previous.game.session
              }
            : undefined
    }

    return {
        board: previous.game.session.board.map(row => [...row]),
        turn: previous.game.session.turnUserId,
        winner: previous.game.session.winnerUserId || undefined
    }
}

function toAppInitialData(snapshot: RealtimeLobbySnapshot): GameData['initialData'] {
    if (snapshot.game.name === 'Jeopardy') {
        return {
            pack: {
                public: true,
                value: snapshot.game.initialData.pack.value
            }
        }
    }

    if (snapshot.game.name !== 'Clicker' || !snapshot.game.initialData.backgroundUrl) {
        return {}
    }

    return {
        background: {
            public: true,
            value: snapshot.game.initialData.backgroundUrl
        }
    }
}

export function toAppLobbyBaseInfo(item: RealtimeLobbyListItem): LobbyBaseInfo {
    return {
        id: item.id,
        private: item.private
    }
}

export function toAppLobbyData(snapshot: RealtimeLobbySnapshot): LobbyData {
    return {
        id: snapshot.roomId,
        private: snapshot.hasPassword,
        gameName: snapshot.game.name,
        members: getAppMembers(snapshot),
        creator: getAppCreator(snapshot),
        readyCheck:
            snapshot.readyCheck.status === 'active'
                ? {
                      members: getAppMembers(snapshot).map(member => {
                          const realtimeMember = snapshot.members.find(item => item.id === member.id)

                          return typeof realtimeMember?.ready === 'boolean'
                              ? {
                                    ...member,
                                    ready: realtimeMember.ready
                                }
                              : member
                      })
                  }
                : null
    }
}

export function toAppGameData(snapshot: RealtimeLobbySnapshot, sessionInternal?: RealtimeJeopardySessionInternal | null): GameData {
    return {
        initialData: toAppInitialData(snapshot),
        name: snapshot.game.name,
        players: getAppPlayers(snapshot),
        session: toAppActiveSession(snapshot.game, snapshot, sessionInternal)
    }
}

export function toAppLobbyChatMessages(snapshot: RealtimeLobbySnapshot): TChatMessage[] {
    return toAppChatMessages(snapshot.chat.slice(-50).reverse())
}

export function toAppGameActionEvent(lobbyId: string, payload: LobbyRoomGameActionMessage['payload']): StateEvents['Game-SessionAction'] {
    return {
        actor: payload.actor,
        lobbyId,
        payload: payload.actionPayload,
        result: payload.actionResult,
        type: payload.actionName
    }
}

export async function getWorkerErrorMessage(response: Response, fallbackMessage: string): Promise<string> {
    try {
        const body = await response.json()

        if (body && typeof body.message === 'string') {
            return body.message
        }
    } catch (_error) {
        return fallbackMessage
    }

    return fallbackMessage
}

function getChangedLobbyMemberData(previous: RealtimeLobbyMember, next: RealtimeLobbyMember): Partial<LobbyMemberData> | null {
    const data: Partial<LobbyMemberData> = {}

    if (previous.userNickname !== next.userNickname) {
        data.userNickname = next.userNickname
    }

    if (previous.userColor !== next.userColor) {
        data.userColor = next.userColor
    }

    if (previous.userAvatarUrl !== next.userAvatarUrl) {
        data.userAvatarUrl = next.userAvatarUrl
    }

    if (previous.connected !== next.connected) {
        data.userIsOnline = next.connected
    }

    if (previous.role !== next.role) {
        data.memberRole = next.role
        data.memberIsPlayer = next.role === 'player'
    }

    return Object.keys(data).length ? data : null
}

function getChangedPlayerData(previous: RealtimeLobbyMember, next: RealtimeLobbyMember): Partial<PlayerData> | null {
    const data: Record<string, unknown> = {}

    if (previous.userNickname !== next.userNickname) {
        data.userNickname = next.userNickname
    }

    if (previous.userColor !== next.userColor) {
        data.userColor = next.userColor
    }

    if (previous.userAvatarUrl !== next.userAvatarUrl) {
        data.userAvatarUrl = next.userAvatarUrl
    }

    if (previous.connected !== next.connected) {
        data.userIsOnline = next.connected
    }

    if (previous.playerChar !== next.playerChar) {
        data.playerChar = next.playerChar
    }

    if ((previous.playerScore ?? 0) !== (next.playerScore ?? 0)) {
        data.playerScore = next.playerScore ?? 0
    }

    if ((previous.playerIsMaster ?? previous.isCreator) !== (next.playerIsMaster ?? next.isCreator)) {
        data.playerIsMaster = next.playerIsMaster ?? next.isCreator
    }

    if (previous.playerIsClickAllowed !== next.playerIsClickAllowed && typeof next.playerIsClickAllowed === 'boolean') {
        data.playerIsClickAllowed = next.playerIsClickAllowed
    }

    return Object.keys(data).length ? (data as Partial<PlayerData>) : null
}

function findBoardMove(previous: RealtimeTicTacToeSession, next: RealtimeTicTacToeSession): { cell: [number, number]; value: 'x' | 'o' } | null {
    for (let row = 0; row < next.board.length; row++) {
        for (let column = 0; column < next.board[row].length; column++) {
            const prevValue = previous.board[row][column]
            const nextValue = next.board[row][column]

            if (prevValue !== nextValue && nextValue !== null) {
                return {
                    cell: [row, column],
                    value: nextValue
                }
            }
        }
    }

    return null
}

export function deriveAppEventsFromSnapshot(previous: RealtimeLobbySnapshot, next: RealtimeLobbySnapshot): AppEventEnvelope[] {
    const events: AppEventEnvelope[] = []
    const previousMembersById = new Map(previous.members.map(member => [member.id, member]))
    const nextMembersById = new Map(next.members.map(member => [member.id, member]))

    next.members.forEach((member, index) => {
        if (!previousMembersById.has(member.id)) {
            events.push({
                ctx: 'Lobby-Join',
                data: {
                    lobbyId: next.roomId,
                    member: toAppLobbyMember(member, index)
                }
            })

            if (member.role === 'player') {
                events.push({
                    ctx: 'Game-Join',
                    data: {
                        lobbyId: next.roomId,
                        player: toAppPlayer(member, index)
                    }
                })
            }
        }
    })

    previous.members.forEach((member, index) => {
        if (!nextMembersById.has(member.id)) {
            events.push({
                ctx: 'Lobby-Leave',
                data: {
                    lobbyId: next.roomId,
                    member: toAppLobbyMember(member, index)
                }
            })

            if (member.role === 'player') {
                events.push({
                    ctx: 'Game-Leave',
                    data: {
                        lobbyId: next.roomId,
                        player: toAppPlayer(member, index)
                    }
                })
            }
        }
    })

    next.members.forEach((member, index) => {
        const previousMember = previousMembersById.get(member.id)

        if (!previousMember) {
            return
        }

        const changedMemberData = getChangedLobbyMemberData(previousMember, member)

        if (changedMemberData) {
            events.push({
                ctx: 'Lobby-MemberUpdate',
                data: {
                    lobbyId: next.roomId,
                    data: {
                        id: member.id,
                        ...changedMemberData
                    }
                }
            })
        }

        if (previousMember.role !== member.role) {
            if (previousMember.role !== 'player' && member.role === 'player') {
                events.push({
                    ctx: 'Game-Join',
                    data: {
                        lobbyId: next.roomId,
                        player: toAppPlayer(member, index)
                    }
                })
            } else if (previousMember.role === 'player' && member.role !== 'player') {
                events.push({
                    ctx: 'Game-Leave',
                    data: {
                        lobbyId: next.roomId,
                        player: toAppPlayer(previousMember, index)
                    }
                })
            }

            return
        }

        if (member.role === 'player') {
            const changedPlayerData = getChangedPlayerData(previousMember, member)

            if (changedPlayerData) {
                events.push({
                    ctx: 'Game-PlayerUpdate',
                    data: {
                        id: member.id,
                        data: changedPlayerData
                    }
                })
            }
        }
    })

    if (previous.readyCheck.status === 'idle' && next.readyCheck.status === 'active') {
        events.push({
            ctx: 'ReadyCheck-Start',
            data: {
                members: getAppMembers(next)
            }
        })
    }

    next.members.forEach(member => {
        const previousMember = previousMembersById.get(member.id)

        if (!previousMember || previousMember.ready === member.ready || typeof member.ready !== 'boolean') {
            return
        }

        events.push({
            ctx: 'ReadyCheck-PlayerStatus',
            data: {
                userNickname: member.userNickname,
                ready: member.ready
            }
        })
    })

    if (previous.readyCheck.status !== next.readyCheck.status && ['success', 'failed'].includes(next.readyCheck.status)) {
        events.push({
            ctx: 'ReadyCheck-End',
            data: {
                status: next.readyCheck.status as 'success' | 'failed'
            }
        })
    }

    const previousChatIds = new Set(previous.chat.map(message => message.id))

    next.chat.forEach(message => {
        if (!previousChatIds.has(message.id)) {
            events.push({
                ctx: 'Chat-NewMessage',
                data: {
                    scope: 'lobby',
                    lobbyId: next.roomId,
                    message: toAppChatMessage(message)
                }
            })
        }
    })

    if (previous.game.name === 'TicTacToe' && next.game.name === 'TicTacToe') {
        if (previous.game.session.status !== 'active' && next.game.session.status === 'active') {
            events.push({
                ctx: 'Game-SessionStart',
                data: {
                    lobbyId: next.roomId,
                    session: toAppActiveSession(next.game, next)!
                }
            })
        }

        const move = previous.game.session.status === 'active' ? findBoardMove(previous.game.session, next.game.session) : null

        if (move) {
            const actor = next.members.find(member => member.role === 'player' && member.playerChar === move.value)

            if (actor) {
                events.push({
                    ctx: 'Game-SessionAction',
                    data: {
                        actor: {
                            id: actor.id,
                            type: 'player'
                        },
                        lobbyId: next.roomId,
                        payload: {
                            cell: move.cell
                        },
                        result: {
                            isDraw: next.game.session.isDraw,
                            nextTurn: next.game.session.status === 'active' ? next.game.session.turnUserId : null,
                            status: 'Success',
                            winLine: next.game.session.winLine,
                            winner: next.game.session.winnerUserId || undefined
                        },
                        type: '$Move'
                    }
                })
            }
        }

        if (previous.game.session.status === 'active' && next.game.session.status === 'finished') {
            events.push({
                ctx: 'Game-SessionEnd',
                data: {
                    lobbyId: next.roomId,
                    players: getAppPlayers(next),
                    session: toAppEndedSession(next, next)
                }
            })
        }
    }

    if (previous.game.name === 'Clicker' && next.game.name === 'Clicker') {
        if (previous.game.session.status === 'idle' && next.game.session.status !== 'idle') {
            events.push({
                ctx: 'Game-SessionStart',
                data: {
                    lobbyId: next.roomId,
                    session: toAppActiveSession(next.game, next)!
                }
            })
        }

        if (previous.game.session.status !== 'idle' && next.game.session.status === 'idle') {
            events.push({
                ctx: 'Game-SessionEnd',
                data: {
                    lobbyId: next.roomId,
                    players: getAppPlayers(next),
                    session: toAppEndedSession(previous, next)
                }
            })
        }
    }

    return events
}
