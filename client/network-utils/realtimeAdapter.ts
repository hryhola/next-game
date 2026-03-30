import type {
    LobbyBaseInfo,
    LobbyGameActionMessage,
    RealtimeChatMessage,
    RealtimeClickerParticipantView,
    RealtimeJeopardyParticipantView,
    RealtimeJeopardySessionInternal,
    RealtimeLobbyListItem,
    RealtimeLobbyMember,
    RealtimeLobbySnapshot,
    RealtimeLobbyGame,
    RealtimeTicTacToeParticipantView,
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

function getMemberPosition(snapshot: RealtimeLobbySnapshot, memberId: string): number {
    return snapshot.members.findIndex(member => member.id === memberId)
}

function toAppPlayerFromTicTacToeParticipant(snapshot: RealtimeLobbySnapshot, participant: RealtimeTicTacToeParticipantView): PlayerData | null {
    const member = snapshot.members.find(item => item.id === participant.memberId)

    if (!member) {
        return null
    }

    return {
        ...toAppLobbyMember(member, getMemberPosition(snapshot, member.id)),
        playerChar: participant.seat,
        playerIsMaster: member.isCreator,
        playerScore: 0
    }
}

function toAppPlayerFromClickerParticipant(snapshot: RealtimeLobbySnapshot, participant: RealtimeClickerParticipantView): PlayerData | null {
    const member = snapshot.members.find(item => item.id === participant.memberId)

    if (!member) {
        return null
    }

    return {
        ...toAppLobbyMember(member, getMemberPosition(snapshot, member.id)),
        playerIsClickAllowed: participant.isClickAllowed,
        playerIsMaster: member.isCreator,
        playerScore: participant.score
    }
}

function toAppPlayerFromJeopardyParticipant(snapshot: RealtimeLobbySnapshot, participant: RealtimeJeopardyParticipantView): PlayerData | null {
    const member = snapshot.members.find(item => item.id === participant.memberId)

    if (!member) {
        return null
    }

    return {
        ...toAppLobbyMember(member, getMemberPosition(snapshot, member.id)),
        playerIsMaster: participant.isMaster,
        playerScore: participant.score
    }
}

function getAppPlayers(snapshot: RealtimeLobbySnapshot): PlayerData[] {
    if (snapshot.game.kind === 'TicTacToe') {
        return snapshot.game.participants.map(participant => toAppPlayerFromTicTacToeParticipant(snapshot, participant)).filter(Boolean) as PlayerData[]
    }

    if (snapshot.game.kind === 'Clicker') {
        return snapshot.game.participants.map(participant => toAppPlayerFromClickerParticipant(snapshot, participant)).filter(Boolean) as PlayerData[]
    }

    return snapshot.game.participants.map(participant => toAppPlayerFromJeopardyParticipant(snapshot, participant)).filter(Boolean) as PlayerData[]
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

function toAppPlayerById(snapshot: RealtimeLobbySnapshot, memberId: string | null): PlayerData | undefined {
    if (!memberId) {
        return undefined
    }

    return getAppPlayers(snapshot).find(player => player.id === memberId)
}

function toAppActiveSession(
    game: RealtimeLobbyGame,
    snapshot: RealtimeLobbySnapshot,
    sessionInternal?: RealtimeJeopardySessionInternal | null
): GameData['session'] {
    if (game.kind === 'Clicker') {
        if (!game.session || game.session.status === 'idle') {
            return undefined
        }

        return {
            playerIsClickAllowed: game.session.playerIsClickAllowed,
            winner: toAppPlayerById(snapshot, game.session.winnerUserId)
        }
    }

    if (game.kind === 'Jeopardy') {
        if (!game.session) {
            return undefined
        }

        const internal = sessionInternal || game.internal

        return internal
            ? {
                  ...game.session,
                  internal
              }
            : {
                  ...game.session
              }
    }

    if (!game.session || game.session.status !== 'active') {
        return undefined
    }

    const session = game.session as RealtimeTicTacToeSession

    return {
        board: session.board.map((row: RealtimeTicTacToeSession['board'][number]) => [...row]),
        turn: session.turnUserId,
        winner: undefined
    }
}

function toAppEndedSession(previous: RealtimeLobbySnapshot, next: RealtimeLobbySnapshot): GameData['session'] {
    if (previous.game.kind === 'Clicker') {
        return {
            playerIsClickAllowed: true,
            winner: toAppPlayerById(next, previous.game.session?.winnerUserId || null)
        }
    }

    if (previous.game.kind === 'Jeopardy') {
        return previous.game.session
            ? {
                  ...(previous.game.internal
                      ? {
                            ...previous.game.session,
                            internal: previous.game.internal
                        }
                      : previous.game.session)
              }
            : undefined
    }

    if (!previous.game.session) {
        return undefined
    }

    return {
        board: previous.game.session.board.map(row => [...row]),
        turn: previous.game.session.turnUserId,
        winner: previous.game.session.winnerUserId || undefined
    }
}

function toAppInitialData(snapshot: RealtimeLobbySnapshot): GameData['initialData'] {
    if (snapshot.game.kind === 'Jeopardy') {
        return {
            pack: {
                public: true,
                value: snapshot.game.config.pack.value
            }
        }
    }

    if (snapshot.game.kind !== 'Clicker' || !snapshot.game.config.backgroundUrl) {
        return {}
    }

    return {
        background: {
            public: true,
            value: snapshot.game.config.backgroundUrl
        }
    }
}

function getAppMembers(snapshot: RealtimeLobbySnapshot): LobbyMemberData[] {
    return snapshot.members.map((member, index) => toAppLobbyMember(member, index))
}

export function toAppLobbyBaseInfo(item: RealtimeLobbyListItem): LobbyBaseInfo {
    return {
        id: item.id,
        private: item.private
    }
}

export function toAppLobbyData(snapshot: RealtimeLobbySnapshot): LobbyData {
    return {
        id: snapshot.lobbyId,
        private: snapshot.hasPassword,
        gameName: snapshot.game.kind,
        members: getAppMembers(snapshot),
        creator: getAppCreator(snapshot),
        readyCheck:
            snapshot.readyCheck.status === 'active'
                ? {
                      members: getAppMembers(snapshot).map(member => {
                          const ready = snapshot.readyCheck.votes[member.id]

                          return typeof ready === 'boolean'
                              ? {
                                    ...member,
                                    ready
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
        name: snapshot.game.kind,
        players: getAppPlayers(snapshot),
        session: toAppActiveSession(snapshot.game, snapshot, sessionInternal)
    }
}

export function toAppLobbyChatMessages(snapshot: RealtimeLobbySnapshot): TChatMessage[] {
    return toAppChatMessages(snapshot.chat.slice(-50).reverse())
}

export function toAppGameActionEvent(lobbyId: string, payload: LobbyGameActionMessage['payload']): StateEvents['Game-SessionAction'] {
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

function getChangedPlayerData(previous: PlayerData, next: PlayerData): Partial<PlayerData> | null {
    const data: Partial<PlayerData> = {}

    if (previous.userNickname !== next.userNickname) {
        data.userNickname = next.userNickname
    }

    if (previous.userColor !== next.userColor) {
        data.userColor = next.userColor
    }

    if (previous.userAvatarUrl !== next.userAvatarUrl) {
        data.userAvatarUrl = next.userAvatarUrl
    }

    if (previous.userIsOnline !== next.userIsOnline) {
        data.userIsOnline = next.userIsOnline
    }

    if (previous.playerChar !== next.playerChar) {
        data.playerChar = next.playerChar
    }

    if (previous.playerScore !== next.playerScore) {
        data.playerScore = next.playerScore
    }

    if (previous.playerIsMaster !== next.playerIsMaster) {
        data.playerIsMaster = next.playerIsMaster
    }

    if (previous.playerIsClickAllowed !== next.playerIsClickAllowed) {
        data.playerIsClickAllowed = next.playerIsClickAllowed
    }

    return Object.keys(data).length ? data : null
}

function findBoardMove(previous: RealtimeTicTacToeSession, next: RealtimeTicTacToeSession): { cell: [number, number]; value: 'x' | 'o' } | null {
    for (let row = 0; row < next.board.length; row += 1) {
        for (let column = 0; column < next.board[row].length; column += 1) {
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

function areSessionsEqual(left: GameData['session'], right: GameData['session']): boolean {
    return JSON.stringify(left) === JSON.stringify(right)
}

export function deriveAppEventsFromSnapshot(previous: RealtimeLobbySnapshot, next: RealtimeLobbySnapshot): AppEventEnvelope[] {
    const events: AppEventEnvelope[] = []
    const previousMembersById = new Map(previous.members.map(member => [member.id, member]))
    const nextMembersById = new Map(next.members.map(member => [member.id, member]))
    const previousPlayersById = new Map(getAppPlayers(previous).map(player => [player.id, player]))
    const nextPlayersById = new Map(getAppPlayers(next).map(player => [player.id, player]))

    next.members.forEach((member, index) => {
        if (!previousMembersById.has(member.id)) {
            events.push({
                ctx: 'Lobby-Join',
                data: {
                    lobbyId: next.lobbyId,
                    member: toAppLobbyMember(member, index)
                }
            })
        }
    })

    previous.members.forEach((member, index) => {
        if (!nextMembersById.has(member.id)) {
            events.push({
                ctx: 'Lobby-Leave',
                data: {
                    lobbyId: next.lobbyId,
                    member: toAppLobbyMember(member, index)
                }
            })
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
                    lobbyId: next.lobbyId,
                    data: {
                        id: member.id,
                        ...changedMemberData
                    }
                }
            })
        }
    })

    nextPlayersById.forEach((player, playerId) => {
        const previousPlayer = previousPlayersById.get(playerId)

        if (!previousPlayer) {
            events.push({
                ctx: 'Game-Join',
                data: {
                    lobbyId: next.lobbyId,
                    player
                }
            })
            return
        }

        const changedPlayerData = getChangedPlayerData(previousPlayer, player)

        if (changedPlayerData) {
            events.push({
                ctx: 'Game-PlayerUpdate',
                data: {
                    id: player.id,
                    data: changedPlayerData
                }
            })
        }
    })

    previousPlayersById.forEach((player, playerId) => {
        if (!nextPlayersById.has(playerId)) {
            events.push({
                ctx: 'Game-Leave',
                data: {
                    lobbyId: next.lobbyId,
                    player
                }
            })
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
        const previousReady = previous.readyCheck.votes[member.id]
        const nextReady = next.readyCheck.votes[member.id]

        if (previousReady === nextReady || typeof nextReady !== 'boolean') {
            return
        }

        events.push({
            ctx: 'ReadyCheck-PlayerStatus',
            data: {
                userNickname: member.userNickname,
                ready: nextReady
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
                    lobbyId: next.lobbyId,
                    message: toAppChatMessage(message)
                }
            })
        }
    })

    const previousSession = toAppActiveSession(previous.game, previous, previous.game.kind === 'Jeopardy' ? previous.game.internal : null)
    const nextSession = toAppActiveSession(next.game, next, next.game.kind === 'Jeopardy' ? next.game.internal : null)

    if (!previousSession && nextSession) {
        events.push({
            ctx: 'Game-SessionStart',
            data: {
                lobbyId: next.lobbyId,
                session: nextSession
            }
        })
    }

    if (previous.game.kind === 'TicTacToe' && next.game.kind === 'TicTacToe' && previous.game.session && next.game.session) {
        const move =
            previous.game.session.status === 'active' && ['active', 'finished'].includes(next.game.session.status)
                ? findBoardMove(previous.game.session, next.game.session)
                : null

        if (move) {
            const actorParticipant = next.game.participants.find(participant => participant.seat === move.value)
            const actor = actorParticipant ? next.members.find(member => member.id === actorParticipant.memberId) : null

            if (actor) {
                events.push({
                    ctx: 'Game-SessionAction',
                    data: {
                        actor: {
                            id: actor.id,
                            type: 'player'
                        },
                        lobbyId: next.lobbyId,
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
    }

    if (previousSession && !nextSession) {
        events.push({
            ctx: 'Game-SessionEnd',
            data: {
                lobbyId: next.lobbyId,
                players: getAppPlayers(next),
                session: toAppEndedSession(previous, next)
            }
        })
    } else if (previousSession && nextSession && !areSessionsEqual(previousSession, nextSession)) {
        events.push({
            ctx: 'Game-SessionUpdate',
            data: {
                lobbyId: next.lobbyId,
                data: nextSession
            }
        })
    }

    return events
}
