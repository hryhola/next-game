import type { LobbyGamePolicy } from './game-contract'
import type { LobbyRecordV2 } from './types'
import { startReadyCheck } from './ready-check'

function createRecord(): LobbyRecordV2 {
    return {
        chat: [],
        game: {
            config: {},
            kind: 'Clicker',
            participants: [],
            session: {
                endsAt: null,
                id: null,
                playerIsClickAllowed: false,
                startedAt: null,
                status: 'idle',
                winnerUserId: null
            }
        },
        lobby: {
            createdAt: '2026-03-31T12:00:00.000Z',
            creatorUserId: 'creator',
            id: 'lobby-1',
            name: 'Test lobby',
            updatedAt: '2026-03-31T12:00:00.000Z'
        },
        members: [
            {
                id: 'creator',
                isCreator: true,
                joinedAt: '2026-03-31T12:00:00.000Z',
                role: 'player',
                userColor: '#ffffff',
                userNickname: 'Creator'
            },
            {
                id: 'player-2',
                isCreator: false,
                joinedAt: '2026-03-31T12:00:01.000Z',
                role: 'player',
                userColor: '#00ff00',
                userNickname: 'Player 2'
            }
        ],
        readyCheck: {
            participants: [],
            status: 'idle',
            updatedAt: '2026-03-31T12:00:00.000Z',
            votes: {}
        },
        version: 2
    }
}

describe('ready check', () => {
    it('allows any player to start the ready check', () => {
        const record = createRecord()
        const policy: LobbyGamePolicy = {
            getReadyCheckParticipantIds: () => ['creator', 'player-2'],
            isInProgress: () => false,
            validateReadyCheck: () => null,
            validateRole: () => null
        }

        const result = startReadyCheck(record, 'player-2', policy)

        expect(result.success).toBe(true)
        expect(record.readyCheck.status).toBe('active')
        expect(record.readyCheck.participants).toEqual(['creator', 'player-2'])
        expect(record.readyCheck.votes).toEqual({
            creator: null,
            'player-2': null
        })
    })
})
