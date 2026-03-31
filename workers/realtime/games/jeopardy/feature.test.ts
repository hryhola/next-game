import type { LobbyGameActionMessage } from '../../../../shared/contracts/realtime-lobby'
import type { JeopardyDeclaration, RealtimeJeopardyState } from '../../../../shared/contracts/jeopardy'
import type { LobbyScheduledTaskPayload, StoredLobbyState } from './internal-types'
import { JeopardyLobbyFeature } from './feature'

type ScheduledTask = {
    key: string
    payload: LobbyScheduledTaskPayload
    scheduledAt: number
}

class MockScheduler {
    tasks: ScheduledTask[] = []

    async schedule(task: ScheduledTask): Promise<void> {
        this.tasks = [...this.tasks.filter(existingTask => existingTask.key !== task.key), task].sort((left, right) => left.scheduledAt - right.scheduledAt)
    }

    async cancel(key: string): Promise<void> {
        this.tasks = this.tasks.filter(task => task.key !== key)
    }

    async cancelByPrefix(prefix: string): Promise<void> {
        this.tasks = this.tasks.filter(task => !task.key.startsWith(prefix))
    }

    async list(): Promise<ScheduledTask[]> {
        return [...this.tasks].sort((left, right) => left.scheduledAt - right.scheduledAt)
    }

    takeBySuffix(suffix: string): ScheduledTask {
        const task = this.tasks.find(item => item.key.endsWith(suffix))

        if (!task) {
            throw new Error(`Expected scheduled task with suffix ${suffix}`)
        }

        this.tasks = this.tasks.filter(item => item.key !== task.key)

        return task
    }

    listSuffixes(): string[] {
        return this.tasks.map(task => task.key.split(':').at(-1)!)
    }
}

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
                        theme: [
                            {
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
                                        wrong: {
                                            answer: {
                                                _text: 'Wrong 1'
                                            }
                                        },
                                        scenario: {
                                            atom: [
                                                {
                                                    _text: 'Question 1'
                                                },
                                                {
                                                    _attributes: {
                                                        type: 'marker'
                                                    }
                                                },
                                                {
                                                    _text: 'Answer 1'
                                                }
                                            ]
                                        }
                                    }
                                }
                            },
                            {
                                _attributes: {
                                    name: 'Theme 2'
                                },
                                questions: {
                                    question: {
                                        _attributes: {
                                            price: '200'
                                        },
                                        right: {
                                            answer: {
                                                _text: 'Correct 2'
                                            }
                                        },
                                        scenario: {
                                            atom: [
                                                {
                                                    _text: 'Question 2'
                                                }
                                            ]
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            }
        }
    }
}

function createState(pack: JeopardyDeclaration.Pack = createPack()): StoredLobbyState {
    return {
        chat: [],
        createdAt: '2026-03-31T12:00:00.000Z',
        creatorUserId: 'master',
        game: {
            config: {
                pack: {
                    public: true,
                    value: 'https://example.com/test-pack.siq'
                }
            },
            name: 'Jeopardy',
            packAssetId: 'asset-1',
            packAuthor: 'Pack Author',
            packDateCreated: '31.03.2026',
            packDeclaration: pack,
            packFileName: 'test-pack.siq',
            packName: pack.package._attributes.name,
            session: null
        },
        lobbyId: 'lobby-1',
        members: [
            {
                id: 'master',
                isCreator: true,
                joinedAt: '2026-03-31T12:00:00.000Z',
                playerScore: 0,
                ready: true,
                role: 'player',
                userColor: '#ffffff',
                userNickname: 'Master'
            },
            {
                id: 'contestant-1',
                isCreator: false,
                joinedAt: '2026-03-31T12:00:01.000Z',
                playerScore: 0,
                ready: true,
                role: 'player',
                userColor: '#00ff00',
                userNickname: 'Contestant 1'
            }
        ],
        name: 'Jeopardy Lobby',
        readyCheck: {
            participants: ['master', 'contestant-1'],
            status: 'success',
            updatedAt: '2026-03-31T12:00:00.000Z',
            votes: {
                'contestant-1': true,
                master: true
            }
        },
        updatedAt: '2026-03-31T12:00:00.000Z'
    }
}

function createFeatureHarness() {
    const scheduler = new MockScheduler()
    const feature = new JeopardyLobbyFeature({
        createGameActionMessage: payload =>
            ({
                payload,
                type: 'game.event'
            }) satisfies LobbyGameActionMessage,
        getConnectedSocketsCount: () => 1,
        persistFinalizedLobbySession: async () => {},
        scheduler: scheduler as never
    })

    return {
        feature,
        scheduler
    }
}

function getQuestionFrame(state: StoredLobbyState): RealtimeJeopardyState.QuestionContentFrame {
    const frame = state.game.session?.frame

    expect(frame?.id).toBe('question-content')

    return frame as RealtimeJeopardyState.QuestionContentFrame
}

async function runScheduledTask(feature: JeopardyLobbyFeature, state: StoredLobbyState, scheduler: MockScheduler, suffix: string) {
    const task = scheduler.takeBySuffix(suffix)
    const result = await feature.handleTask(state, task.payload)

    expect(result.stateChanged).toBe(true)
}

async function startGame(feature: JeopardyLobbyFeature, state: StoredLobbyState) {
    const result = await feature.startGame(state, 'master')

    expect(result.success).toBe(true)
    expect(feature.getActiveLobbySessionId(state)).toBeTruthy()
}

async function advanceToAnswerRequest(feature: JeopardyLobbyFeature, state: StoredLobbyState, scheduler: MockScheduler) {
    await startGame(feature, state)
    await runScheduledTask(feature, state, scheduler, 'pack-preview.complete')

    const skipPreviewResult = await feature.handleAction(state, 'master', '$SkipVote', null)

    expect(skipPreviewResult.success).toBe(true)
    expect(state.game.session?.frame.id).toBe('question-board')

    const pickQuestionResult = await feature.handleAction(state, 'master', '$PickQuestion', {
        questionId: '0-0-0'
    })

    expect(pickQuestionResult.success).toBe(true)

    await runScheduledTask(feature, state, scheduler, 'pick-question.complete')
    await runScheduledTask(feature, state, scheduler, 'question.atom.complete')

    const frame = getQuestionFrame(state)

    expect(frame.answeringStatus).toBe('allowed')
}

describe('jeopardy flow', () => {
    beforeEach(() => {
        jest.useFakeTimers()
        jest.setSystemTime(new Date('2026-03-31T12:00:00.000Z'))
    })

    afterEach(() => {
        jest.useRealTimers()
        jest.restoreAllMocks()
    })

    it('shows the round name briefly and then chains category previews one by one', async () => {
        const state = createState()
        const { feature, scheduler } = createFeatureHarness()

        await startGame(feature, state)
        await runScheduledTask(feature, state, scheduler, 'pack-preview.complete')

        expect(state.game.session?.frame).toEqual({
            id: 'rounds-preview',
            isRoundName: true,
            text: 'Round 1'
        })
        expect(scheduler.listSuffixes()).toEqual(['round-preview.theme.0'])

        await runScheduledTask(feature, state, scheduler, 'round-preview.theme.0')
        expect(state.game.session?.frame).toEqual({
            id: 'rounds-preview',
            isRoundName: false,
            text: 'Theme 1'
        })
        expect(scheduler.listSuffixes()).toEqual(['round-preview.theme.1'])

        await runScheduledTask(feature, state, scheduler, 'round-preview.theme.1')
        expect(state.game.session?.frame).toEqual({
            id: 'rounds-preview',
            isRoundName: false,
            text: 'Theme 2'
        })
        expect(scheduler.listSuffixes()).toEqual(['round-preview.complete'])

        await runScheduledTask(feature, state, scheduler, 'round-preview.complete')
        expect(state.game.session?.frame.id).toBe('question-board')
    })

    it('preserves remaining answer time when pausing and resuming mid-answer', async () => {
        const state = createState()
        const { feature, scheduler } = createFeatureHarness()

        await advanceToAnswerRequest(feature, state, scheduler)

        jest.setSystemTime(new Date('2026-03-31T12:00:02.000Z'))

        const answerRequestResult = await feature.handleAction(state, 'contestant-1', '$AnswerRequest', null)

        expect(answerRequestResult.success).toBe(true)
        expect(getQuestionFrame(state).answeringStatus).toBe('answering')

        jest.setSystemTime(new Date('2026-03-31T12:00:06.000Z'))

        const pauseResult = await feature.handleAction(state, 'master', '$Pause', null)

        expect(pauseResult.success).toBe(true)
        expect(state.game.session?.isPaused).toBe(true)

        jest.setSystemTime(new Date('2026-03-31T12:00:11.000Z'))

        const resumeResult = await feature.handleAction(state, 'master', '$Resume', null)

        expect(resumeResult.success).toBe(true)
        expect(state.game.session?.isPaused).toBe(false)
        const frame = getQuestionFrame(state)

        expect(frame?.answerGivingStartedAt).toBe('2026-03-31T12:00:07.000Z')
        expect(frame?.answerGivingEndsAt).toBe('2026-03-31T12:00:17.000Z')
        expect(frame?.answerGivingTimeLeft).toBe(60)
        expect(scheduler.listSuffixes()).toContain('answer-giving.complete')
        expect(scheduler.tasks.find(task => task.key.endsWith('answer-giving.complete'))?.scheduledAt).toBe(new Date('2026-03-31T12:00:17.000Z').getTime())
    })

    it('skips through answer phases without reopening the same timer from the start', async () => {
        const state = createState()
        const { feature, scheduler } = createFeatureHarness()

        await advanceToAnswerRequest(feature, state, scheduler)

        jest.setSystemTime(new Date('2026-03-31T12:00:02.000Z'))

        const answerRequestResult = await feature.handleAction(state, 'contestant-1', '$AnswerRequest', null)

        expect(answerRequestResult.success).toBe(true)
        expect(state.game.session?.internal.currentAnsweringPlayerId).toBeNull()

        const skipAnsweringResult = await feature.handleAction(state, 'master', '$SkipVote', null)

        expect(skipAnsweringResult.success).toBe(true)
        expect(getQuestionFrame(state).answeringStatus).toBe('answer-verifying')
        expect(state.game.session?.internal.currentAnsweringPlayerId).toBe('contestant-1')

        jest.setSystemTime(new Date('2026-03-31T12:00:03.000Z'))

        const skipVerifyingResult = await feature.handleAction(state, 'master', '$SkipVote', null)

        expect(skipVerifyingResult.success).toBe(true)
        expect(state.members.find(member => member.id === 'contestant-1')?.playerScore).toBe(-100)
        const resumedRequestFrame = getQuestionFrame(state)

        expect(resumedRequestFrame.answeringStatus).toBe('allowed')
        expect(resumedRequestFrame.answerRequestStartedAt).toBe('2026-03-31T12:00:01.000Z')
        expect(resumedRequestFrame.answerRequestEndsAt).toBe('2026-03-31T12:00:06.000Z')
        expect(resumedRequestFrame.answerRequestTimeLeft).toBe(60)

        const skipAllowedResult = await feature.handleAction(state, 'master', '$SkipVote', null)

        expect(skipAllowedResult.success).toBe(true)
        const revealFrame = getQuestionFrame(state)

        expect(revealFrame.answeringStatus).toBe('too-late')
        expect(revealFrame.content).toBe('Answer 1')
    })
})
