import type { RealtimeLobbyMember, RealtimeLobbyState } from '../../../shared/contracts/realtime-lobby'
import type { LobbyGameFeature, LobbyGameContext } from './game-contract'
import type { LobbyRecordV2 } from './types'

function projectMember(
    record: LobbyRecordV2,
    member: LobbyRecordV2['members'][number],
    getConnectedSocketsCount: LobbyGameContext['getConnectedSocketsCount']
): RealtimeLobbyMember {
    return {
        ...member,
        connected: getConnectedSocketsCount(member.id) > 0
    }
}

export function projectLobbyState(
    record: LobbyRecordV2,
    feature: LobbyGameFeature,
    ctx: Pick<LobbyGameContext, 'getConnectedSocketsCount'>,
    viewerUserId?: string
): RealtimeLobbyState {
    return {
        chat: [...record.chat],
        createdAt: record.lobby.createdAt,
        creatorUserId: record.lobby.creatorUserId,
        game: feature.project(record, ctx, viewerUserId),
        hasPassword: Boolean(record.lobby.password),
        members: record.members
            .map(member => projectMember(record, member, ctx.getConnectedSocketsCount))
            .sort((left, right) => left.joinedAt.localeCompare(right.joinedAt)),
        name: record.lobby.name,
        readyCheck: {
            participants: [...record.readyCheck.participants],
            status: record.readyCheck.status,
            updatedAt: record.readyCheck.updatedAt,
            votes: { ...record.readyCheck.votes }
        },
        lobbyId: record.lobby.id,
        updatedAt: record.lobby.updatedAt,
        version: 2
    }
}
