import type { LobbyGameContext } from '../../lobby/game-contract'
import type { LobbyRecordV2, StoredJeopardyGameState } from '../../lobby/types'
import { joinLobbyMember, leaveLobbyMember } from '../../lobby/members'
import { createJeopardyGameFeature } from './definition'
import type { JeopardyDeclaration } from '../../../../shared/contracts/jeopardy'

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
                date: '31.03.2026',
                difficulty: '1.0',
                id: 'pack-1',
                logo: '@logo.png',
                name: 'Test Pack',
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
                                            _text: 'Correct 1'
                                        }
                                    },
                                    scenario: {
                                        atom: [
                                            {
                                                _text: 'Question 1'
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

function createRecord(): LobbyRecordV2 {
    const pack = createPack()

    return {
        chat: [],
        game: {
            config: {
                pack: {
                    public: true,
                    value: 'https://example.com/test-pack.siq'
                }
            },
            kind: 'Jeopardy',
            packAssetId: 'asset-1',
            packAuthor: 'Pack Author',
            packDateCreated: '31.03.2026',
            packDeclaration: pack,
            packFileName: 'test-pack.siq',
            packName: 'Test Pack',
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
                }
            ],
            session: null
        } satisfies StoredJeopardyGameState,
        lobby: {
            createdAt: '2026-03-31T12:00:00.000Z',
            creatorUserId: 'master',
            id: 'lobby-1',
            name: 'Jeopardy Lobby',
            updatedAt: '2026-03-31T12:00:00.000Z'
        },
        members: [
            {
                id: 'master',
                isCreator: true,
                joinedAt: '2026-03-31T12:00:00.000Z',
                role: 'player',
                userColor: '#ffffff',
                userNickname: 'Master'
            },
            {
                id: 'contestant-1',
                isCreator: false,
                joinedAt: '2026-03-31T12:00:01.000Z',
                role: 'player',
                userColor: '#00ff00',
                userNickname: 'Contestant 1'
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

describe('jeopardy member changes', () => {
    it('keeps an active session running when a new player joins', async () => {
        const ctx = createContext()
        const feature = createJeopardyGameFeature(ctx)
        const record = createRecord()

        const startResult = await feature.start(record, 'master', ctx)

        expect(startResult.success).toBe(true)

        const joinResult = await joinLobbyMember(
            record,
            {
                id: 'contestant-2',
                userColor: '#ff00ff',
                userNickname: 'Contestant 2'
            },
            'player',
            undefined,
            feature.getPolicy(record),
            feature,
            ctx
        )

        expect(joinResult.success).toBe(true)
        expect((record.game as StoredJeopardyGameState).session).not.toBeNull()
        expect((record.game as StoredJeopardyGameState).participants).toEqual([
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
        ])
    })

    it('keeps an active session running when a contestant leaves', async () => {
        const ctx = createContext()
        const feature = createJeopardyGameFeature(ctx)
        const record = createRecord()

        const startResult = await feature.start(record, 'master', ctx)

        expect(startResult.success).toBe(true)

        const leaveResult = await leaveLobbyMember(record, 'contestant-1', feature, ctx, 'member_left')

        expect(leaveResult.success).toBe(true)
        expect((record.game as StoredJeopardyGameState).session).not.toBeNull()
        expect(leaveResult.finalizedSession).toBeUndefined()
        expect((record.game as StoredJeopardyGameState).participants).toEqual([
            {
                memberId: 'master',
                role: 'master',
                score: 0
            }
        ])
    })

    it('reassigns the master role to another player when the creator leaves', async () => {
        const ctx = createContext()
        const feature = createJeopardyGameFeature(ctx)
        const record = createRecord()

        record.members.splice(1, 0, {
            id: 'spectator-1',
            isCreator: false,
            joinedAt: '2026-03-31T12:00:00.500Z',
            role: 'spectator',
            userColor: '#ffaa00',
            userNickname: 'Spectator 1'
        })

        const startResult = await feature.start(record, 'master', ctx)

        expect(startResult.success).toBe(true)

        const leaveResult = await leaveLobbyMember(record, 'master', feature, ctx, 'member_left')

        expect(leaveResult.success).toBe(true)
        expect(record.lobby.creatorUserId).toBe('contestant-1')
        expect(record.members.find(member => member.id === 'contestant-1')?.isCreator).toBe(true)
        expect(record.members.find(member => member.id === 'spectator-1')?.isCreator).toBe(false)
        expect((record.game as StoredJeopardyGameState).session).not.toBeNull()
        expect((record.game as StoredJeopardyGameState).participants).toEqual([
            {
                memberId: 'contestant-1',
                role: 'master',
                score: 0
            }
        ])
    })
})
