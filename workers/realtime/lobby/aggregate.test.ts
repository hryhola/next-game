import type { IdentityProfile } from '../../../shared/contracts/identity'
import type { JeopardyDeclaration } from '../../../shared/contracts/jeopardy'
import type { LobbyGameContext } from './game-contract'
import { LobbyAggregate } from './aggregate'
import { LobbyGameRegistry } from './registry'
import type { LobbyRecordV2, StoredJeopardyGameState } from './types'

function createPack(): JeopardyDeclaration.Pack {
    return {
        _declaration: {
            _attributes: {
                encoding: 'utf-8',
                version: '1.0'
            }
        },
        package: {
            _attributes: {
                date: '02.04.2026',
                difficulty: '1.0',
                id: 'pack-1',
                logo: '@logo.png',
                name: 'Tip Test Pack',
                version: '4',
                xmlns: 'http://vladimirkhil.com/ygpackage3.0.xsd'
            },
            info: {
                authors: {
                    author: {
                        _text: 'Pack Author'
                    }
                }
            },
            rounds: {
                round: {
                    _attributes: {
                        name: 'Round 1'
                    },
                    themes: {
                        theme: {
                            _attributes: {
                                name: 'Theme 1'
                            },
                            questions: {
                                question: {
                                    _attributes: {
                                        price: '100'
                                    },
                                    right: {
                                        answer: {
                                            _text: 'Correct'
                                        }
                                    },
                                    scenario: {
                                        atom: [
                                            {
                                                _text: 'Question'
                                            }
                                        ]
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

function createContext(): LobbyGameContext {
    return {
        createGameActionMessage: payload => ({
            payload,
            type: 'game.event'
        }),
        getConnectedSocketsCount: () => 1,
        persistFinalizedLobbySession: async () => {},
        scheduler: {
            cancel: async () => {},
            cancelByPrefix: async () => {},
            list: async () => [],
            schedule: async () => {}
        } as LobbyGameContext['scheduler']
    }
}

function createJeopardyRecord(): LobbyRecordV2 {
    const pack = createPack()

    return {
        chat: [],
        game: {
            config: {
                pack: {
                    public: true,
                    value: 'https://example.com/tip-test-pack.siq'
                }
            },
            kind: 'Jeopardy',
            packAssetId: 'asset-1',
            packAuthor: 'Pack Author',
            packDateCreated: '02.04.2026',
            packDeclaration: pack,
            packFileName: 'tip-test-pack.siq',
            packName: 'Tip Test Pack',
            participants: [
                {
                    memberId: 'master',
                    role: 'master',
                    score: 0
                },
                {
                    memberId: 'contestant-1',
                    role: 'contestant',
                    score: 0
                },
                {
                    memberId: 'contestant-2',
                    role: 'contestant',
                    score: 0
                }
            ],
            session: null
        } satisfies StoredJeopardyGameState,
        lobby: {
            createdAt: '2026-04-02T12:00:00.000Z',
            creatorUserId: 'master',
            id: 'lobby-1',
            name: 'Jeopardy Lobby',
            updatedAt: '2026-04-02T12:00:00.000Z'
        },
        members: [
            {
                id: 'master',
                isCreator: true,
                joinedAt: '2026-04-02T12:00:00.000Z',
                role: 'player',
                userColor: '#ffffff',
                userNickname: 'Master'
            },
            {
                id: 'contestant-1',
                isCreator: false,
                joinedAt: '2026-04-02T12:00:01.000Z',
                role: 'player',
                userColor: '#00ff00',
                userNickname: 'Contestant 1'
            },
            {
                id: 'contestant-2',
                isCreator: false,
                joinedAt: '2026-04-02T12:00:02.000Z',
                role: 'player',
                userColor: '#0000ff',
                userNickname: 'Contestant 2'
            },
            {
                id: 'spectator-1',
                isCreator: false,
                joinedAt: '2026-04-02T12:00:03.000Z',
                role: 'spectator',
                userColor: '#ffaa00',
                userNickname: 'Spectator 1'
            }
        ],
        readyCheck: {
            participants: [],
            status: 'idle',
            updatedAt: '2026-04-02T12:00:00.000Z',
            votes: {}
        },
        version: 2
    }
}

function createAggregate(record: LobbyRecordV2, ctx: LobbyGameContext): LobbyAggregate {
    return new LobbyAggregate(record, new LobbyGameRegistry(ctx), ctx)
}

function getActor(record: LobbyRecordV2, userId: string): IdentityProfile {
    const member = record.members.find(item => item.id === userId)

    if (!member) {
        throw new Error(`Missing member ${userId}`)
    }

    return {
        id: member.id,
        userColor: member.userColor,
        userNickname: member.userNickname
    }
}

function getScores(record: LobbyRecordV2): Record<string, number> {
    return Object.fromEntries(((record.game as StoredJeopardyGameState).participants || []).map(participant => [participant.memberId, participant.score]))
}

describe('LobbyAggregate Jeopardy tips', () => {
    it('transfers one point from a contestant to another player during an active Jeopardy session', async () => {
        const ctx = createContext()
        const record = createJeopardyRecord()
        const aggregate = createAggregate(record, ctx)

        await aggregate.handleLobbyCommand(getActor(record, 'master'), 'game.start', null)

        const result = await aggregate.handleLobbyCommand(getActor(record, 'contestant-1'), 'tip', {
            id: 'tip-1',
            toUserId: 'contestant-2'
        })

        expect(result.success).toBe(true)
        expect(result).toMatchObject({
            lobbyEvent: {
                eventName: 'tip',
                eventPayload: {
                    from: 'Contestant 1',
                    id: 'tip-1',
                    to: 'Contestant 2'
                }
            },
            stateChanged: true
        })
        expect(getScores(record)).toEqual({
            'contestant-1': -1,
            'contestant-2': 1,
            master: 0
        })
    })

    it('awards one point to the tipped player when the Jeopardy master sends the tip', async () => {
        const ctx = createContext()
        const record = createJeopardyRecord()
        const aggregate = createAggregate(record, ctx)

        await aggregate.handleLobbyCommand(getActor(record, 'master'), 'game.start', null)

        const result = await aggregate.handleLobbyCommand(getActor(record, 'master'), 'tip', {
            id: 'tip-2',
            toUserId: 'contestant-1'
        })

        expect(result.success).toBe(true)
        expect(result).toMatchObject({
            stateChanged: true
        })
        expect(getScores(record)).toEqual({
            'contestant-1': 1,
            'contestant-2': 0,
            master: 0
        })
    })

    it('keeps Jeopardy scores unchanged when tipping before the session has started', async () => {
        const ctx = createContext()
        const record = createJeopardyRecord()
        const aggregate = createAggregate(record, ctx)

        const result = await aggregate.handleLobbyCommand(getActor(record, 'contestant-1'), 'tip', {
            id: 'tip-3',
            toUserId: 'contestant-2'
        })

        expect(result.success).toBe(true)
        expect(result).toMatchObject({
            stateChanged: false
        })
        expect(getScores(record)).toEqual({
            'contestant-1': 0,
            'contestant-2': 0,
            master: 0
        })
    })

    it('keeps Jeopardy scores unchanged when a spectator tips during an active session', async () => {
        const ctx = createContext()
        const record = createJeopardyRecord()
        const aggregate = createAggregate(record, ctx)

        await aggregate.handleLobbyCommand(getActor(record, 'master'), 'game.start', null)

        const result = await aggregate.handleLobbyCommand(getActor(record, 'spectator-1'), 'tip', {
            id: 'tip-4',
            toUserId: 'contestant-1'
        })

        expect(result.success).toBe(true)
        expect(result).toMatchObject({
            stateChanged: false
        })
        expect(getScores(record)).toEqual({
            'contestant-1': 0,
            'contestant-2': 0,
            master: 0
        })
    })
})
