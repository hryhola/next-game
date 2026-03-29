import type {
    LobbyBaseInfo,
    RealtimeChatMessage,
    RealtimeLobbyListItem,
    RealtimeLobbyMember,
    RealtimeLobbySnapshot,
    RealtimeTicTacToeSession,
    StateEventName,
    StateEvents
} from 'shared/contracts'
import type { GameData, LobbyData, LobbyMemberData, PlayerData, TChatMessage } from 'state'

export type LegacyEventEnvelope = {
    [E in StateEventName]: {
        ctx: E
        data: StateEvents[E]
    }
}[StateEventName]

function toLegacyChatMessage(message: RealtimeChatMessage): TChatMessage {
    return {
        id: message.id,
        from: message.from,
        fromColor: message.fromColor,
        text: message.text
    }
}

function toLegacyLobbyMember(member: RealtimeLobbyMember, memberPosition: number): LobbyMemberData {
    return {
        id: member.id,
        memberIsCreator: member.isCreator,
        memberIsPlayer: member.role === 'player',
        memberPosition,
        memberRole: member.role,
        userAvatarUrl: member.userAvatarUrl,
        userColor: member.userColor,
        userIsOnline: member.connected,
        userNickname: member.userNickname
    }
}

function toLegacyPlayer(member: RealtimeLobbyMember, memberPosition: number): PlayerData {
    return {
        ...toLegacyLobbyMember(member, memberPosition),
        playerChar: member.playerChar!,
        playerIsMaster: member.isCreator,
        playerScore: 0
    } as PlayerData
}

function getLegacyMembers(snapshot: RealtimeLobbySnapshot): LobbyMemberData[] {
    return snapshot.members.map((member, index) => toLegacyLobbyMember(member, index))
}

function getLegacyPlayers(snapshot: RealtimeLobbySnapshot): PlayerData[] {
    return snapshot.members
        .map((member, index) => ({ member, index }))
        .filter(({ member }) => member.role === 'player')
        .map(({ member, index }) => toLegacyPlayer(member, index))
}

function toLegacyActiveSession(session: RealtimeTicTacToeSession) {
    if (session.status !== 'active') {
        return undefined
    }

    return {
        board: session.board.map(row => [...row]),
        turn: session.turnUserId,
        winner: undefined
    }
}

function findLegacyCreator(snapshot: RealtimeLobbySnapshot) {
    const creator = snapshot.members.find(member => member.isCreator) || snapshot.members[0]

    return creator
        ? {
              id: creator.id,
              userAvatarUrl: creator.userAvatarUrl,
              userColor: creator.userColor,
              userIsOnline: creator.connected,
              userNickname: creator.userNickname
          }
        : {
              id: '',
              userAvatarUrl: undefined,
              userColor: '',
              userIsOnline: false,
              userNickname: ''
          }
}

export function toLegacyLobbyBaseInfo(item: RealtimeLobbyListItem): LobbyBaseInfo {
    return {
        id: item.id,
        private: item.private
    }
}

export function toLegacyLobbyData(snapshot: RealtimeLobbySnapshot): LobbyData {
    return {
        id: snapshot.roomId,
        private: snapshot.hasPassword,
        gameName: snapshot.game.name,
        members: getLegacyMembers(snapshot),
        creator: findLegacyCreator(snapshot),
        readyCheck:
            snapshot.readyCheck.status === 'active'
                ? {
                      members: getLegacyMembers(snapshot).map(member => {
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

export function toLegacyGameData(snapshot: RealtimeLobbySnapshot): GameData {
    return {
        initialData: {},
        name: snapshot.game.name,
        players: getLegacyPlayers(snapshot),
        session: toLegacyActiveSession(snapshot.game.session)
    }
}

export function toLegacyLobbyChatMessages(snapshot: RealtimeLobbySnapshot): TChatMessage[] {
    return snapshot.chat.slice(-50).reverse().map(toLegacyChatMessage)
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

function getChangedMemberData(previous: RealtimeLobbyMember, next: RealtimeLobbyMember): Partial<LobbyMemberData> | null {
    const data: Partial<LobbyMemberData> & { id: string } = {
        id: next.id
    }

    if (previous.userNickname !== next.userNickname) {
        data.userNickname = next.userNickname
    }

    if (previous.userColor !== next.userColor) {
        data.userColor = next.userColor
    }

    if (previous.userAvatarUrl !== next.userAvatarUrl) {
        data.userAvatarUrl = next.userAvatarUrl
    }

    if (previous.role !== next.role) {
        data.memberRole = next.role
        data.memberIsPlayer = next.role === 'player'
    }

    return Object.keys(data).length > 1 ? data : null
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

export function deriveLegacyEventsFromSnapshot(previous: RealtimeLobbySnapshot, next: RealtimeLobbySnapshot): LegacyEventEnvelope[] {
    const events: LegacyEventEnvelope[] = []
    const previousMembersById = new Map(previous.members.map(member => [member.id, member]))
    const nextMembersById = new Map(next.members.map(member => [member.id, member]))

    next.members.forEach((member, index) => {
        if (!previousMembersById.has(member.id)) {
            events.push({
                ctx: 'Lobby-Join',
                data: {
                    lobbyId: next.roomId,
                    member: toLegacyLobbyMember(member, index)
                }
            })

            if (member.role === 'player') {
                events.push({
                    ctx: 'Game-Join',
                    data: {
                        lobbyId: next.roomId,
                        player: toLegacyPlayer(member, index)
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
                    member: toLegacyLobbyMember(member, index)
                }
            })

            if (member.role === 'player') {
                events.push({
                    ctx: 'Game-Leave',
                    data: {
                        lobbyId: next.roomId,
                        player: toLegacyPlayer(member, index)
                    }
                })
            }
        }
    })

    next.members.forEach(member => {
        const previousMember = previousMembersById.get(member.id)

        if (!previousMember) {
            return
        }

        const changedMemberData = getChangedMemberData(previousMember, member)

        if (changedMemberData) {
            events.push({
                ctx: 'Lobby-MemberUpdate',
                data: {
                    lobbyId: next.roomId,
                    data: changedMemberData
                }
            })

            if (member.role === 'player') {
                events.push({
                    ctx: 'Game-PlayerUpdate',
                    data: {
                        id: member.id,
                        data: changedMemberData
                    }
                })
            }
        }
    })

    if (previous.readyCheck.status === 'idle' && next.readyCheck.status === 'active') {
        events.push({
            ctx: 'ReadyCheck-Start',
            data: {
                members: getLegacyMembers(next)
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
                    message: toLegacyChatMessage(message)
                }
            })
        }
    })

    const previousSession = previous.game.session
    const nextSession = next.game.session

    if (previousSession.status !== 'active' && nextSession.status === 'active') {
        events.push({
            ctx: 'Game-SessionStart',
            data: {
                lobbyId: next.roomId,
                session: toLegacyActiveSession(nextSession)!
            }
        })
    }

    const move = previousSession.status === 'active' ? findBoardMove(previousSession, nextSession) : null

    if (move) {
        const actor = next.members.find(member => member.role === 'player' && member.playerChar === move.value)

        if (actor) {
            events.push({
                ctx: 'Game-SessionAction',
                data: {
                    lobbyId: next.roomId,
                    actor: {
                        id: actor.id,
                        type: 'player'
                    },
                    payload: {
                        cell: move.cell
                    },
                    result: {
                        isDraw: nextSession.isDraw,
                        nextTurn: nextSession.status === 'active' ? nextSession.turnUserId : null,
                        status: 'Success',
                        winLine: nextSession.winLine,
                        winner: nextSession.winnerUserId || undefined
                    },
                    type: '$Move'
                }
            })
        }
    }

    if (previousSession.status === 'active' && nextSession.status === 'finished') {
        events.push({
            ctx: 'Game-SessionEnd',
            data: {
                lobbyId: next.roomId,
                players: getLegacyPlayers(next),
                session: {
                    board: nextSession.board.map(row => [...row]),
                    turn: nextSession.turnUserId,
                    winner: nextSession.winnerUserId || undefined
                }
            }
        })
    }

    return events
}
