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

    async complete(keys: string[]): Promise<void> {
        const keySet = new Set(keys)
        this.tasks = this.tasks.filter(task => !keySet.has(task.key))
    }

    peekBySuffix(suffix: string): ScheduledTask {
        const task = this.tasks.find(item => this.matchesSuffix(item, suffix))

        if (!task) {
            throw new Error(`Expected scheduled task with suffix ${suffix}`)
        }

        return task
    }

    takeBySuffix(suffix: string): ScheduledTask {
        const task = this.peekBySuffix(suffix)

        this.tasks = this.tasks.filter(item => item.key !== task.key)

        return task
    }

    listSuffixes(): string[] {
        return this.tasks.map(task => this.normalizeSuffix(task.key))
    }

    private matchesSuffix(task: ScheduledTask, suffix: string): boolean {
        return this.normalizeSuffix(task.key) === suffix || task.key.endsWith(suffix)
    }

    private normalizeSuffix(key: string): string {
        const rawSuffix = key.split(':').at(-1)!

        if (rawSuffix.startsWith('question.atom.complete.')) {
            return 'question.atom.complete'
        }

        return rawSuffix
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

function createScenarioQuestion({
    answerText = 'Answer',
    correctAnswer = 'Correct',
    price,
    type,
    wrongAnswer
}: {
    answerText?: string
    correctAnswer?: string
    price: string
    type?: string
    wrongAnswer?: string
}): JeopardyDeclaration.Question {
    return {
        _attributes: {
            ...(type ? { type } : {}),
            price
        },
        right: {
            answer: {
                _text: correctAnswer
            }
        },
        ...(wrongAnswer
            ? {
                  wrong: {
                      answer: {
                          _text: wrongAnswer
                      }
                  }
              }
            : {}),
        scenario: {
            atom: [
                {
                    _text: `Question ${price}`
                },
                {
                    _attributes: {
                        type: 'marker'
                    }
                },
                {
                    _text: answerText
                }
            ]
        }
    }
}

function createScenarioQuestionWithAtoms({
    atoms,
    correctAnswer = 'Correct',
    price,
    type,
    wrongAnswer
}: {
    atoms: JeopardyDeclaration.ContentItem[]
    correctAnswer?: string
    price: string
    type?: string
    wrongAnswer?: string
}): JeopardyDeclaration.Question {
    return {
        _attributes: {
            ...(type ? { type } : {}),
            price
        },
        right: {
            answer: {
                _text: correctAnswer
            }
        },
        ...(wrongAnswer
            ? {
                  wrong: {
                      answer: {
                          _text: wrongAnswer
                      }
                  }
              }
            : {}),
        scenario: {
            atom: atoms
        }
    }
}

function createParamQuestion({
    answerText = 'Answer',
    correctAnswer = 'Correct',
    params,
    price,
    type,
    wrongAnswer
}: {
    answerText?: string
    correctAnswer?: string
    params?: JeopardyDeclaration.QuestionParameter[]
    price: string
    type: string
    wrongAnswer?: string
}): JeopardyDeclaration.Question {
    return {
        _attributes: {
            price,
            type
        },
        params: {
            param: params || [
                {
                    _attributes: {
                        name: 'question',
                        type: 'content'
                    },
                    item: {
                        _text: `Question ${price}`
                    }
                }
            ]
        },
        right: {
            answer: {
                _text: correctAnswer
            }
        },
        ...(wrongAnswer
            ? {
                  wrong: {
                      answer: {
                          _text: wrongAnswer
                      }
                  }
              }
            : {}),
        ...(answerText
            ? {
                  scenario: {
                      atom: [
                          {
                              _text: answerText
                          }
                      ]
                  }
              }
            : {})
    }
}

function createPackWithQuestions(questions: JeopardyDeclaration.Question[]): JeopardyDeclaration.Pack {
    const pack = createPack()

    ;(pack.package.rounds.round as JeopardyDeclaration.Round).themes.theme = {
        _attributes: {
            name: 'Theme 1'
        },
        questions: {
            question: questions
        }
    }

    return pack
}

function createFinalRoundPack(question: JeopardyDeclaration.Question = createScenarioQuestion({ price: '100' })): JeopardyDeclaration.Pack {
    const pack = createPack()

    pack.package.rounds.round = {
        _attributes: {
            name: 'Final Round',
            type: 'final'
        },
        themes: {
            theme: {
                _attributes: {
                    name: 'Final Theme'
                },
                questions: {
                    question
                }
            }
        }
    }

    return pack
}

function createPackWithRounds(rounds: JeopardyDeclaration.Round[]): JeopardyDeclaration.Pack {
    const pack = createPack()

    pack.package.rounds.round = rounds

    return pack
}

function createState(pack: JeopardyDeclaration.Pack = createPack(), contestantCount = 1): StoredLobbyState {
    const contestants = Array.from({ length: contestantCount }, (_, index) => ({
        id: `contestant-${index + 1}`,
        isCreator: false,
        joinedAt: `2026-03-31T12:00:0${index + 1}.000Z`,
        playerScore: 0,
        ready: true,
        role: 'player' as const,
        userColor: '#00ff00',
        userNickname: `Contestant ${index + 1}`
    }))

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
            ...contestants
        ],
        name: 'Jeopardy Lobby',
        readyCheck: {
            participants: ['master', ...contestants.map(contestant => contestant.id)],
            status: 'success',
            updatedAt: '2026-03-31T12:00:00.000Z',
            votes: {
                master: true,
                ...Object.fromEntries(contestants.map(contestant => [contestant.id, true]))
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

async function runAlarmScheduledTask(feature: JeopardyLobbyFeature, state: StoredLobbyState, scheduler: MockScheduler, suffix: string) {
    const task = scheduler.peekBySuffix(suffix)
    const result = await feature.handleTask(state, task.payload)

    expect(result.stateChanged).toBe(true)

    await scheduler.complete([task.key])
}

async function startGame(feature: JeopardyLobbyFeature, state: StoredLobbyState) {
    const result = await feature.startGame(state, 'master')

    expect(result.success).toBe(true)
    expect(feature.getActiveLobbySessionId(state)).toBeTruthy()
}

async function advanceToQuestionBoard(feature: JeopardyLobbyFeature, state: StoredLobbyState, scheduler: MockScheduler) {
    await startGame(feature, state)
    await runScheduledTask(feature, state, scheduler, 'pack-preview.complete')

    const skipPreviewResult = await feature.handleAction(state, 'master', '$SkipVote', null)

    expect(skipPreviewResult.success).toBe(true)
    expect(state.game.session?.frame.id).toBe('question-board')
}

async function advanceToQuestion(feature: JeopardyLobbyFeature, state: StoredLobbyState, scheduler: MockScheduler, questionId: string) {
    await advanceToQuestionBoard(feature, state, scheduler)

    const pickQuestionResult = await feature.handleAction(state, 'master', '$PickQuestion', {
        questionId
    })

    expect(pickQuestionResult.success).toBe(true)
    await runScheduledTask(feature, state, scheduler, 'pick-question.complete')
}

async function advanceToAnswerRequest(feature: JeopardyLobbyFeature, state: StoredLobbyState, scheduler: MockScheduler) {
    await advanceToQuestion(feature, state, scheduler, '0-0-0')
    await runScheduledTask(feature, state, scheduler, 'question.atom.complete')

    const frame = getQuestionFrame(state)

    expect(frame.answeringStatus).toBe('allowed')
}

async function advanceToFinalRound(feature: JeopardyLobbyFeature, state: StoredLobbyState, scheduler: MockScheduler) {
    await startGame(feature, state)
    await runScheduledTask(feature, state, scheduler, 'pack-preview.complete')

    const skipPreviewResult = await feature.handleAction(state, 'master', '$SkipVote', null)

    expect(skipPreviewResult.success).toBe(true)
    expect(state.game.session?.frame.id).toBe('final-round-board')
}

async function advanceToFinalBetting(feature: JeopardyLobbyFeature, state: StoredLobbyState, scheduler: MockScheduler) {
    await advanceToFinalRound(feature, state, scheduler)
    await runScheduledTask(feature, state, scheduler, 'final.phase.skipping.complete')

    expect(state.game.session?.frame.id).toBe('final-round-board')
    expect((state.game.session?.frame as RealtimeJeopardyState.FinalRoundBoardFrame).status).toBe('betting')
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

    it('starts without requiring a ready check', async () => {
        const state = createState()
        const { feature } = createFeatureHarness()

        state.members.forEach(member => {
            member.ready = null
        })
        state.readyCheck = {
            participants: [],
            status: 'idle',
            updatedAt: '2026-03-31T12:00:00.000Z',
            votes: {}
        }

        const result = await feature.startGame(state, 'master')

        expect(result.success).toBe(true)
        expect(state.game.session?.frame.id).toBe('pack-preview')
    })

    it('does not get stuck in clue presentation when a legacy image question starts with an empty atom', async () => {
        const pack = createPackWithQuestions([
            {
                _attributes: {
                    price: '100'
                },
                right: {
                    answer: {
                        _text: 'Answer'
                    }
                },
                scenario: {
                    atom: [
                        {},
                        {
                            _attributes: {
                                type: 'image'
                            },
                            _text: '@cat.jpg'
                        }
                    ]
                }
            }
        ])
        const state = createState(pack)
        const { feature, scheduler } = createFeatureHarness()

        await advanceToQuestion(feature, state, scheduler, '0-0-0')

        let frame = getQuestionFrame(state)

        expect(frame.type).toBe('image')
        expect(frame.content).toBe('cat.jpg')
        expect(frame.answeringStatus).toBe('too-early')

        await runScheduledTask(feature, state, scheduler, 'question.atom.complete')

        frame = getQuestionFrame(state)

        expect(frame.answeringStatus).toBe('allowed')
        expect(frame.specialPhase).toBeUndefined()
        expect(scheduler.listSuffixes()).toContain('answer-request.complete')
    })

    it('publishes metadata for a picked non-standard question', async () => {
        const pack = createPackWithQuestions([
            createScenarioQuestion({
                price: '500',
                type: 'stake'
            })
        ])
        const state = createState(pack)
        const { feature, scheduler } = createFeatureHarness()

        await advanceToQuestionBoard(feature, state, scheduler)

        const result = await feature.handleAction(state, 'master', '$PickQuestion', {
            questionId: '0-0-0'
        })

        expect(result.success).toBe(true)
        expect(result.action).toMatchObject({
            payload: {
                actionName: '$PickQuestion',
                actionPayload: {
                    questionId: '0-0-0'
                },
                actionResult: {
                    questionPrice: 500,
                    questionTheme: 'Theme 1',
                    questionType: 'stake',
                    success: true
                }
            }
        })
    })

    it('keeps the master answer reference populated during question presentation', async () => {
        const pack = createPackWithQuestions([
            createScenarioQuestion({
                correctAnswer: 'Right answer',
                price: '300',
                wrongAnswer: 'Wrong answer'
            })
        ])
        const state = createState(pack)
        const { feature, scheduler } = createFeatureHarness()

        await advanceToQuestion(feature, state, scheduler, '0-0-0')

        expect(state.game.session?.internal.correctAnswers).toEqual(['Right answer'])
        expect(state.game.session?.internal.incorrectAnswers).toEqual(['Wrong answer'])
    })

    it('uses the parent category name as the effective question theme when no question override is defined', async () => {
        const pack = createPackWithQuestions([
            createScenarioQuestion({
                price: '300'
            })
        ])
        const state = createState(pack)
        const { feature, scheduler } = createFeatureHarness()

        await advanceToQuestion(feature, state, scheduler, '0-0-0')

        expect(getQuestionFrame(state).questionTheme).toBe('Theme 1')
    })

    it('lets the master skip a category and clears only that category on the board', async () => {
        const state = createState()
        const { feature, scheduler } = createFeatureHarness()

        await advanceToQuestionBoard(feature, state, scheduler)

        const result = await feature.handleAction(state, 'master', '$SkipCategory', {
            themeId: '0-0'
        })

        expect(result.success).toBe(true)
        expect(result.action).toMatchObject({
            payload: {
                actionName: '$SkipCategory',
                actionPayload: {
                    themeId: '0-0'
                },
                actionResult: {
                    themeName: 'Theme 1',
                    success: true
                }
            },
            type: 'game.event'
        })
        expect(state.game.session?.internal.answeredQuestions).toEqual(['0-0-0'])
        expect(state.game.session?.frame).toMatchObject({
            id: 'question-board',
            roundId: 0
        })
        expect((state.game.session?.frame as RealtimeJeopardyState.QuestionBoardFrame).themes).toEqual([
            {
                name: 'Theme 1',
                question: [
                    {
                        isAnswered: true,
                        price: '100',
                        questionId: '0-0-0'
                    }
                ],
                themeId: '0-0'
            },
            {
                name: 'Theme 2',
                question: [
                    {
                        isAnswered: false,
                        price: '200',
                        questionId: '0-1-0'
                    }
                ],
                themeId: '0-1'
            }
        ])
    })

    it('allows only the Jeopardy master to skip categories', async () => {
        const state = createState()
        const { feature, scheduler } = createFeatureHarness()

        await advanceToQuestionBoard(feature, state, scheduler)

        const result = await feature.handleAction(state, 'contestant-1', '$SkipCategory', {
            themeId: '0-0'
        })

        expect(result.success).toBe(false)
        expect(result.code).toBe('forbidden')
        expect(state.game.session?.internal.answeredQuestions).toEqual([])
    })

    it('does not allow category skipping while a question is already being opened', async () => {
        const state = createState()
        const { feature, scheduler } = createFeatureHarness()

        await advanceToQuestionBoard(feature, state, scheduler)

        const pickResult = await feature.handleAction(state, 'master', '$PickQuestion', {
            questionId: '0-0-0'
        })

        expect(pickResult.success).toBe(true)

        const result = await feature.handleAction(state, 'master', '$SkipCategory', {
            themeId: '0-1'
        })

        expect(result.success).toBe(false)
        expect(result.code).toBe('already_picked')
        expect(state.game.session?.frame).toMatchObject({
            id: 'question-board',
            pickedQuestion: '0-0-0'
        })
    })

    it('moves to the next round when the master skips the last remaining category', async () => {
        const pack = createPackWithRounds([
            {
                _attributes: {
                    name: 'Round 1'
                },
                themes: {
                    theme: {
                        _attributes: {
                            name: 'Theme 1'
                        },
                        questions: {
                            question: createScenarioQuestion({
                                price: '100'
                            })
                        }
                    }
                }
            },
            {
                _attributes: {
                    name: 'Round 2'
                },
                themes: {
                    theme: {
                        _attributes: {
                            name: 'Theme 2'
                        },
                        questions: {
                            question: createScenarioQuestion({
                                price: '200'
                            })
                        }
                    }
                }
            }
        ])
        const state = createState(pack)
        const { feature, scheduler } = createFeatureHarness()

        await advanceToQuestionBoard(feature, state, scheduler)

        const result = await feature.handleAction(state, 'master', '$SkipCategory', {
            themeId: '0-0'
        })

        expect(result.success).toBe(true)
        expect(state.game.session?.internal.currentRoundId).toBe(1)
        expect(state.game.session?.frame).toEqual({
            id: 'rounds-preview',
            isRoundName: true,
            text: 'Round 2'
        })
        expect(scheduler.listSuffixes()).toEqual(['round-preview.theme.0'])

        await runScheduledTask(feature, state, scheduler, 'round-preview.theme.0')
        await runScheduledTask(feature, state, scheduler, 'round-preview.complete')

        expect(state.game.session?.frame).toMatchObject({
            id: 'question-board',
            roundId: 1
        })
    })

    it('ends the game when the master skips the last remaining category in the final round', async () => {
        const state = createState(createPackWithQuestions([createScenarioQuestion({ price: '100' })]))
        const { feature, scheduler } = createFeatureHarness()

        await advanceToQuestionBoard(feature, state, scheduler)

        const result = await feature.handleAction(state, 'master', '$SkipCategory', {
            themeId: '0-0'
        })

        expect(result.success).toBe(true)
        expect(state.game.session?.frame.id).toBe('final-score')
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

    it('puts contestants on cooldown when they buzz during question presentation', async () => {
        const state = createState()
        const { feature, scheduler } = createFeatureHarness()

        await advanceToQuestion(feature, state, scheduler, '0-0-0')

        let frame = getQuestionFrame(state)

        expect(frame.specialPhase).toBe('showing-question')
        expect(frame.answeringStatus).toBe('too-early')

        const earlyBuzzResult = await feature.handleAction(state, 'contestant-1', '$AnswerRequest', null)

        expect(earlyBuzzResult.success).toBe(true)
        frame = getQuestionFrame(state)
        expect(frame.playersOnCooldown).toContain('contestant-1')
        expect(scheduler.listSuffixes()).toContain('cooldown.contestant-1')

        const repeatedBuzzResult = await feature.handleAction(state, 'contestant-1', '$AnswerRequest', null)

        expect(repeatedBuzzResult.success).toBe(false)
        expect(repeatedBuzzResult.code).toBe('player_unavailable')

        await runScheduledTask(feature, state, scheduler, 'cooldown.contestant-1')

        frame = getQuestionFrame(state)
        expect(frame.playersOnCooldown).not.toContain('contestant-1')
    })

    it('requires every contestant to vote before skipping a clue atom and resets votes on the next atom', async () => {
        const pack = createPackWithQuestions([
            createScenarioQuestionWithAtoms({
                atoms: [
                    {
                        _text: 'Question 1'
                    },
                    {
                        _text: 'Question 2'
                    },
                    {
                        _attributes: {
                            type: 'marker'
                        }
                    },
                    {
                        _text: 'Answer 1'
                    }
                ],
                price: '100'
            })
        ])
        const state = createState(pack, 2)
        const { feature, scheduler } = createFeatureHarness()

        await advanceToQuestion(feature, state, scheduler, '0-0-0')

        let frame = getQuestionFrame(state)

        expect(frame.content).toBe('Question 1')
        expect(frame.skipVoted).toEqual([])

        const firstVoteResult = await feature.handleAction(state, 'contestant-1', '$SkipVote', null)

        expect(firstVoteResult.success).toBe(true)
        expect(firstVoteResult.action).toMatchObject({
            payload: {
                actionName: '$SkipVote',
                actionResult: {
                    mode: 'vote',
                    success: true
                },
                actor: {
                    id: 'contestant-1',
                    type: 'player'
                }
            }
        })

        frame = getQuestionFrame(state)
        expect(frame.content).toBe('Question 1')
        expect(frame.skipVoted).toEqual(['contestant-1'])

        const finalVoteResult = await feature.handleAction(state, 'contestant-2', '$SkipVote', null)

        expect(finalVoteResult.success).toBe(true)
        expect(finalVoteResult.action).toMatchObject({
            payload: {
                actionName: '$SkipVote',
                actionResult: {
                    mode: 'vote',
                    success: true
                },
                actor: {
                    id: 'contestant-2',
                    type: 'player'
                }
            }
        })

        frame = getQuestionFrame(state)
        expect(frame.content).toBe('Question 2')
        expect(frame.specialPhase).toBe('showing-question')
        expect(frame.recentSkipVoters).toEqual(['contestant-1', 'contestant-2'])
        expect(frame.skipVoted).toEqual([])

        await runScheduledTask(feature, state, scheduler, 'question.atom.complete')

        frame = getQuestionFrame(state)
        expect(frame.answeringStatus).toBe('allowed')
        expect(frame.recentSkipVoters).toEqual([])
    })

    it('does not allow contestants to vote-skip outside clue atom presentation', async () => {
        const state = createState(createPack(), 2)
        const { feature, scheduler } = createFeatureHarness()

        await advanceToAnswerRequest(feature, state, scheduler)

        const result = await feature.handleAction(state, 'contestant-1', '$SkipVote', null)

        expect(result.success).toBe(false)
        expect(result.code).toBe('forbidden')
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

    it('emits the rated player id when the master verifies an answer', async () => {
        const state = createState()
        const { feature, scheduler } = createFeatureHarness()

        await advanceToAnswerRequest(feature, state, scheduler)

        expect((await feature.handleAction(state, 'contestant-1', '$AnswerRequest', null)).success).toBe(true)
        expect((await feature.handleAction(state, 'contestant-1', '$GiveAnswer', { text: 'Test answer' })).success).toBe(true)

        const result = await feature.handleAction(state, 'master', '$RateAnswer', {
            rating: 'approved'
        })

        expect(result.success).toBe(true)
        expect(result.action).toMatchObject({
            payload: {
                actionName: '$RateAnswer',
                actionResult: {
                    answeringPlayerId: 'contestant-1',
                    rating: 'approved',
                    success: true
                }
            }
        })
    })

    it('supports partial approvals and awards the configured fraction of the question value', async () => {
        const state = createState()
        const { feature, scheduler } = createFeatureHarness()

        await advanceToAnswerRequest(feature, state, scheduler)

        expect((await feature.handleAction(state, 'contestant-1', '$AnswerRequest', null)).success).toBe(true)
        expect((await feature.handleAction(state, 'contestant-1', '$GiveAnswer', { text: 'Test answer' })).success).toBe(true)

        const result = await feature.handleAction(state, 'master', '$RateAnswer', {
            approvalMode: 'third',
            rating: 'approved'
        })

        expect(result.success).toBe(true)
        expect(result.action).toMatchObject({
            payload: {
                actionName: '$RateAnswer',
                actionPayload: {
                    approvalMode: 'third',
                    rating: 'approved'
                },
                actionResult: {
                    approvalMode: 'third',
                    answeringPlayerId: 'contestant-1',
                    rating: 'approved',
                    success: true
                }
            }
        })
        expect(state.members.find(member => member.id === 'contestant-1')?.playerScore).toBeCloseTo(33.33, 2)
        expect(state.game.session?.internal.pickerId).toBe('contestant-1')
        expect(state.game.session?.internal.currentQuestionAnswers?.['contestant-1']).toMatchObject({
            approvalMode: 'third',
            rate: 'approved'
        })
    })

    it('publishes a decline action when answer verification time runs out', async () => {
        const state = createState()
        const { feature, scheduler } = createFeatureHarness()

        await advanceToAnswerRequest(feature, state, scheduler)

        expect((await feature.handleAction(state, 'contestant-1', '$AnswerRequest', null)).success).toBe(true)
        expect((await feature.handleAction(state, 'contestant-1', '$GiveAnswer', { text: 'Timed out answer' })).success).toBe(true)

        const task = scheduler.takeBySuffix('answer-verifying.complete')
        const result = await feature.handleTask(state, task.payload)

        expect(result.stateChanged).toBe(true)
        expect(result.action).toMatchObject({
            payload: {
                actionName: '$RateAnswer',
                actionPayload: {
                    rating: 'declined'
                },
                actionResult: {
                    answeringPlayerId: 'contestant-1',
                    rating: 'declined',
                    success: true
                }
            }
        })
        expect(state.members.find(member => member.id === 'contestant-1')?.playerScore).toBe(-100)
        expect(getQuestionFrame(state).answeringStatus).toBe('allowed')
    })

    it('reopens the answer request when the active answering player leaves', async () => {
        const state = createState()
        const { feature, scheduler } = createFeatureHarness()

        await advanceToAnswerRequest(feature, state, scheduler)

        jest.setSystemTime(new Date('2026-03-31T12:00:02.000Z'))

        const answerRequestResult = await feature.handleAction(state, 'contestant-1', '$AnswerRequest', null)

        expect(answerRequestResult.success).toBe(true)
        expect(getQuestionFrame(state).answeringStatus).toBe('answering')

        state.members = state.members.filter(member => member.id !== 'contestant-1')

        await feature.reconcileSessionMembers(state)

        const frame = getQuestionFrame(state)

        expect(feature.getActiveLobbySessionId(state)).toBeTruthy()
        expect(frame.answeringPlayerId).toBeNull()
        expect(frame.answeringStatus).toBe('allowed')
        expect(frame.specialPhase).toBeUndefined()
        expect(frame.answerRequestStartedAt).toBe('2026-03-31T12:00:00.000Z')
        expect(frame.answerRequestEndsAt).toBe('2026-03-31T12:00:05.000Z')
        expect(frame.answerRequestTimeLeft).toBe(60)
        expect(scheduler.listSuffixes()).toContain('answer-request.complete')
        expect(scheduler.listSuffixes()).not.toContain('answer-giving.complete')
    })

    it('supports stake questions with a timed stake selection that survives pause and resume', async () => {
        const pack = createPackWithQuestions([createScenarioQuestion({ price: '300', type: 'stake' })])
        const state = createState(pack)
        const { feature, scheduler } = createFeatureHarness()

        await advanceToQuestion(feature, state, scheduler, '0-0-0')

        const frame = getQuestionFrame(state)

        expect(frame.questionType).toBe('stake')
        expect(frame.specialPhase).toBe('making-stake')
        expect(frame.answeringPlayerId).toBe('contestant-1')
        expect(frame.phaseStartedAt).toBe('2026-03-31T12:00:00.000Z')
        expect(frame.phaseEndsAt).toBe('2026-03-31T12:00:30.000Z')

        jest.setSystemTime(new Date('2026-03-31T12:00:10.000Z'))
        await feature.handleAction(state, 'master', '$Pause', null)
        jest.setSystemTime(new Date('2026-03-31T12:00:15.000Z'))
        await feature.handleAction(state, 'master', '$Resume', null)

        const resumedFrame = getQuestionFrame(state)

        expect(resumedFrame.phaseStartedAt).toBe('2026-03-31T12:00:05.000Z')
        expect(resumedFrame.phaseEndsAt).toBe('2026-03-31T12:00:35.000Z')
        expect(resumedFrame.phaseTimeLeft).toBeCloseTo(66.666, 1)

        const setStakeResult = await feature.handleAction(state, 'contestant-1', '$SetQuestionValue', { value: 500 })

        expect(setStakeResult.success).toBe(true)
        await runScheduledTask(feature, state, scheduler, 'question.atom.complete')

        const answeringFrame = getQuestionFrame(state)

        expect(answeringFrame.answeringStatus).toBe('answering')
        expect(answeringFrame.answeringPlayerId).toBe('contestant-1')
        expect(answeringFrame.questionPrice).toBe(500)
        expect(answeringFrame.specialPhase).toBeUndefined()
    })

    it('keeps no-risk questions safe on a miss and still awards the doubled value on approval', async () => {
        const pack = createPackWithQuestions([
            createParamQuestion({
                price: '100',
                type: 'noRisk',
                params: [
                    {
                        _attributes: {
                            name: 'question',
                            type: 'content'
                        },
                        item: {
                            _text: 'No-risk question'
                        }
                    }
                ]
            }),
            createParamQuestion({
                price: '100',
                type: 'forYourself',
                params: [
                    {
                        _attributes: {
                            name: 'question',
                            type: 'content'
                        },
                        item: {
                            _text: 'For-yourself question'
                        }
                    }
                ]
            })
        ])
        const state = createState(pack)
        const { feature, scheduler } = createFeatureHarness()

        state.members.find(member => member.id === 'contestant-1')!.playerScore = 300

        await advanceToQuestion(feature, state, scheduler, '0-0-0')
        await runScheduledTask(feature, state, scheduler, 'question.atom.complete')

        expect(getQuestionFrame(state).questionType).toBe('noRisk')
        expect((await feature.handleAction(state, 'contestant-1', '$GiveAnswer', { text: 'Wrong' })).success).toBe(true)
        expect((await feature.handleAction(state, 'master', '$RateAnswer', { rating: 'declined' })).success).toBe(true)
        expect(state.members.find(member => member.id === 'contestant-1')?.playerScore).toBe(300)

        await runScheduledTask(feature, state, scheduler, 'question.atom.complete')

        expect(state.game.session?.frame.id).toBe('question-board')

        expect(
            await feature.handleAction(state, 'master', '$PickQuestion', {
                questionId: '0-0-1'
            })
        ).toMatchObject({ success: true })
        await runScheduledTask(feature, state, scheduler, 'pick-question.complete')
        await runScheduledTask(feature, state, scheduler, 'question.atom.complete')

        expect(getQuestionFrame(state).questionType).toBe('forYourself')
        expect((await feature.handleAction(state, 'contestant-1', '$GiveAnswer', { text: 'Right' })).success).toBe(true)
        expect((await feature.handleAction(state, 'master', '$RateAnswer', { rating: 'approved' })).success).toBe(true)
        expect(state.members.find(member => member.id === 'contestant-1')?.playerScore).toBe(500)
    })

    it('shows clue progress for auto-advanced image atoms before stake answers are allowed', async () => {
        const pack = createPackWithQuestions([
            createScenarioQuestionWithAtoms({
                atoms: [
                    {
                        _attributes: {
                            isRef: 'True',
                            type: 'image'
                        },
                        _text: '@stake-image.jpg'
                    },
                    {
                        _attributes: {
                            type: 'marker'
                        }
                    },
                    {
                        _text: 'Stake answer'
                    }
                ],
                price: '300',
                type: 'stake'
            })
        ])
        const state = createState(pack)
        const { feature, scheduler } = createFeatureHarness()

        await advanceToQuestion(feature, state, scheduler, '0-0-0')

        const setStakeResult = await feature.handleAction(state, 'contestant-1', '$SetQuestionValue', { value: 500 })

        expect(setStakeResult.success).toBe(true)

        const frame = getQuestionFrame(state)

        expect(frame.type).toBe('image')
        expect(frame.specialPhase).toBe('showing-question')
        expect(frame.phaseStartedAt).toBe('2026-03-31T12:00:00.000Z')
        expect(frame.phaseEndsAt).toBe('2026-03-31T12:00:05.000Z')
        expect(frame.phaseTimeLeft).toBe(100)
        expect(scheduler.listSuffixes()).toContain('question.atom.complete')
    })

    it('keeps the next clue timer alive across durable-object alarm completion for multi-step clues', async () => {
        const pack = createPackWithQuestions([
            createScenarioQuestionWithAtoms({
                atoms: [
                    {
                        _text: 'Назвіть вид грибів'
                    },
                    {
                        _attributes: {
                            isRef: 'True',
                            type: 'image'
                        },
                        _text: '@mush612.jpg'
                    }
                ],
                correctAnswer: 'Лисичка справжня / Cantharellus cibarius',
                price: '300'
            })
        ])
        const state = createState(pack)
        const { feature, scheduler } = createFeatureHarness()

        await advanceToQuestion(feature, state, scheduler, '0-0-0')

        let frame = getQuestionFrame(state)
        expect(frame.content).toBe('Назвіть вид грибів')
        expect(frame.type).toBe('text')
        expect(scheduler.listSuffixes()).toContain('question.atom.complete')

        await runAlarmScheduledTask(feature, state, scheduler, 'question.atom.complete')

        frame = getQuestionFrame(state)
        expect(frame.content).toBe('mush612.jpg')
        expect(frame.type).toBe('image')
        expect(frame.specialPhase).toBe('showing-question')
        expect(scheduler.listSuffixes()).toContain('question.atom.complete')

        await runAlarmScheduledTask(feature, state, scheduler, 'question.atom.complete')

        frame = getQuestionFrame(state)
        expect(frame.answeringStatus).toBe('allowed')
        expect(frame.answerRequestTimeLeft).toBe(100)
    })

    it('allows the chosen contestant to set the public price before a secret-public-price question starts', async () => {
        const pack = createPackWithQuestions([
            createParamQuestion({
                price: '400',
                type: 'secretPublicPrice',
                params: [
                    {
                        _attributes: {
                            name: 'theme'
                        },
                        _text: 'Public Secret'
                    },
                    {
                        _attributes: {
                            name: 'price',
                            type: 'numberSet'
                        },
                        numberSet: {
                            _attributes: {
                                maximum: '700',
                                minimum: '300',
                                step: '200'
                            }
                        }
                    },
                    {
                        _attributes: {
                            name: 'selectionMode'
                        },
                        _text: 'exceptCurrent'
                    },
                    {
                        _attributes: {
                            name: 'question',
                            type: 'content'
                        },
                        item: {
                            _text: 'Public price secret question'
                        }
                    }
                ]
            })
        ])
        const state = createState(pack, 2)
        const { feature, scheduler } = createFeatureHarness()

        await advanceToQuestion(feature, state, scheduler, '0-0-0')

        let frame = getQuestionFrame(state)

        expect(frame.specialPhase).toBe('selecting-player')
        expect(frame.eligiblePlayerIds).toEqual(['contestant-2'])

        expect(
            await feature.handleAction(state, 'contestant-1', '$SelectQuestionPlayer', {
                playerId: 'contestant-2'
            })
        ).toMatchObject({ success: true })

        frame = getQuestionFrame(state)
        expect(frame.specialPhase).toBe('choosing-price')
        expect(frame.answeringPlayerId).toBe('contestant-2')
        expect(frame.selectedPlayerId).toBe('contestant-2')
        expect(frame.priceOptions).toEqual([300, 500, 700])

        expect((await feature.handleAction(state, 'contestant-2', '$SetQuestionValue', { value: 500 })).success).toBe(true)

        frame = getQuestionFrame(state)
        expect(frame.specialPhase).toBe('showing-question')
        expect(frame.questionPrice).toBe(500)
        expect(frame.content).toBe('Public price secret question')

        await runScheduledTask(feature, state, scheduler, 'question.atom.complete')

        frame = getQuestionFrame(state)
        expect(frame.answeringStatus).toBe('answering')
        expect(frame.answeringPlayerId).toBe('contestant-2')
        expect(frame.questionPrice).toBe(500)
    })

    it('lets the chooser transfer a secret question to another contestant', async () => {
        const pack = createPackWithQuestions([
            createParamQuestion({
                price: '400',
                type: 'secret',
                params: [
                    {
                        _attributes: {
                            name: 'theme'
                        },
                        _text: 'Secret Theme'
                    },
                    {
                        _attributes: {
                            name: 'price',
                            type: 'numberSet'
                        },
                        numberSet: {
                            _attributes: {
                                maximum: '700',
                                minimum: '700',
                                step: '0'
                            }
                        }
                    },
                    {
                        _attributes: {
                            name: 'selectionMode'
                        },
                        _text: 'exceptCurrent'
                    },
                    {
                        _attributes: {
                            name: 'question',
                            type: 'content'
                        },
                        item: {
                            _text: 'Secret question'
                        }
                    }
                ]
            })
        ])
        const state = createState(pack, 2)
        const { feature, scheduler } = createFeatureHarness()

        await advanceToQuestion(feature, state, scheduler, '0-0-0')

        let frame = getQuestionFrame(state)

        expect(frame.specialPhase).toBe('selecting-player')
        expect(frame.answeringPlayerId).toBe('contestant-1')
        expect(frame.eligiblePlayerIds).toEqual(['contestant-2'])

        const selectionResult = await feature.handleAction(state, 'contestant-1', '$SelectQuestionPlayer', {
            playerId: 'contestant-2'
        })

        expect(selectionResult.success).toBe(true)
        await runScheduledTask(feature, state, scheduler, 'question.atom.complete')

        frame = getQuestionFrame(state)
        expect(frame.selectedPlayerId).toBe('contestant-2')
        expect(frame.answeringStatus).toBe('answering')
        expect(frame.answeringPlayerId).toBe('contestant-2')
        expect(frame.questionPrice).toBe(700)
        expect(frame.questionTheme).toBe('Secret Theme')
        expect(frame.specialPhase).toBeUndefined()
    })

    it('keeps the transferred contestant as the next picker even after a wrong secret answer', async () => {
        const pack = createPackWithQuestions([
            createParamQuestion({
                price: '400',
                type: 'secret',
                params: [
                    {
                        _attributes: {
                            name: 'theme'
                        },
                        _text: 'Secret Theme'
                    },
                    {
                        _attributes: {
                            name: 'price',
                            type: 'numberSet'
                        },
                        numberSet: {
                            _attributes: {
                                maximum: '700',
                                minimum: '700',
                                step: '0'
                            }
                        }
                    },
                    {
                        _attributes: {
                            name: 'selectionMode'
                        },
                        _text: 'exceptCurrent'
                    },
                    {
                        _attributes: {
                            name: 'question',
                            type: 'content'
                        },
                        item: {
                            _text: 'Secret question'
                        }
                    }
                ]
            }),
            createScenarioQuestion({
                price: '500'
            })
        ])
        const state = createState(pack, 2)
        const { feature, scheduler } = createFeatureHarness()

        await advanceToQuestion(feature, state, scheduler, '0-0-0')

        expect(
            await feature.handleAction(state, 'contestant-1', '$SelectQuestionPlayer', {
                playerId: 'contestant-2'
            })
        ).toMatchObject({ success: true })
        await runScheduledTask(feature, state, scheduler, 'question.atom.complete')

        expect((await feature.handleAction(state, 'contestant-2', '$GiveAnswer', { text: 'Wrong answer' })).success).toBe(true)
        expect((await feature.handleAction(state, 'master', '$RateAnswer', { rating: 'declined' })).success).toBe(true)
        expect(state.game.session?.internal.pickerId).toBe('contestant-2')

        await runScheduledTask(feature, state, scheduler, 'question.atom.complete')

        expect(state.game.session?.frame).toMatchObject({
            id: 'question-board',
            pickerId: 'contestant-2',
            roundId: 0
        })
    })

    it('falls back to the chooser when a secret question has no eligible transfer targets', async () => {
        const pack = createPackWithQuestions([
            createParamQuestion({
                price: '500',
                type: 'secret',
                params: [
                    {
                        _attributes: {
                            name: 'theme'
                        },
                        _text: 'Solo Theme'
                    },
                    {
                        _attributes: {
                            name: 'price',
                            type: 'numberSet'
                        },
                        numberSet: {
                            _attributes: {
                                maximum: '500',
                                minimum: '500',
                                step: '0'
                            }
                        }
                    },
                    {
                        _attributes: {
                            name: 'selectionMode'
                        },
                        _text: 'exceptCurrent'
                    },
                    {
                        _attributes: {
                            name: 'question',
                            type: 'content'
                        },
                        item: {
                            _text: 'Solo secret question'
                        }
                    }
                ]
            })
        ])
        const state = createState(pack)
        const { feature, scheduler } = createFeatureHarness()

        await advanceToQuestion(feature, state, scheduler, '0-0-0')

        let frame = getQuestionFrame(state)

        expect(frame.content).toBe('Solo secret question')
        expect(frame.specialPhase).toBe('showing-question')
        expect(frame.selectedPlayerId).toBe('contestant-1')
        expect(frame.questionPrice).toBe(500)
        expect(frame.questionTheme).toBe('Solo Theme')

        await runScheduledTask(feature, state, scheduler, 'question.atom.complete')

        frame = getQuestionFrame(state)

        expect(frame.answeringStatus).toBe('answering')
        expect(frame.answeringPlayerId).toBe('contestant-1')
        expect(frame.selectedPlayerId).toBe('contestant-1')
        expect(frame.specialPhase).toBeUndefined()
    })

    it('resolves secret-no-question immediately after selection and gives the chooser role to the recipient', async () => {
        const pack = createPackWithQuestions([
            createParamQuestion({
                price: '400',
                type: 'secretNoQuestion',
                params: [
                    {
                        _attributes: {
                            name: 'theme'
                        },
                        _text: 'Gift Theme'
                    }
                ]
            }),
            createScenarioQuestion({
                price: '500'
            })
        ])
        const state = createState(pack, 2)
        const { feature, scheduler } = createFeatureHarness()

        await advanceToQuestion(feature, state, scheduler, '0-0-0')

        let frame = getQuestionFrame(state)

        expect(frame.specialPhase).toBe('selecting-player')
        expect(frame.eligiblePlayerIds).toEqual(['contestant-2'])

        expect(
            await feature.handleAction(state, 'contestant-1', '$SelectQuestionPlayer', {
                playerId: 'contestant-2'
            })
        ).toMatchObject({ success: true })

        expect(state.members.find(member => member.id === 'contestant-2')?.playerScore).toBe(400)
        expect(state.game.session?.frame.id).toBe('question-board')

        const boardFrame = state.game.session?.frame as RealtimeJeopardyState.QuestionBoardFrame

        expect(boardFrame.pickerId).toBe('contestant-2')
        expect(boardFrame.themes[0]?.question[0]?.isAnswered).toBe(true)
        expect(boardFrame.themes[0]?.question[1]?.isAnswered).toBe(false)
    })

    it('only lets eligible hidden-stake contestants answer and scores stake-all questions by wager', async () => {
        const pack = createPackWithQuestions([
            createParamQuestion({
                price: '300',
                type: 'stakeAll',
                params: [
                    {
                        _attributes: {
                            name: 'question',
                            type: 'content'
                        },
                        item: {
                            _text: 'Stake all question'
                        }
                    }
                ]
            })
        ])
        const state = createState(pack, 2)
        const { feature, scheduler } = createFeatureHarness()

        state.members.find(member => member.id === 'contestant-1')!.playerScore = 400
        state.members.find(member => member.id === 'contestant-2')!.playerScore = 0

        await advanceToQuestion(feature, state, scheduler, '0-0-0')

        let frame = getQuestionFrame(state)

        expect(frame.specialPhase).toBe('making-hidden-stakes')
        expect(frame.eligiblePlayerIds).toEqual(['contestant-1'])

        const ineligibleStakeResult = await feature.handleAction(state, 'contestant-2', '$SetQuestionValue', { value: 50 })

        expect(ineligibleStakeResult).toMatchObject({
            code: 'invalid_bettor',
            success: false
        })

        expect((await feature.handleAction(state, 'contestant-1', '$SetQuestionValue', { value: 250 })).success).toBe(true)

        frame = getQuestionFrame(state)
        expect(frame.specialPhase).toBe('showing-question')
        expect(frame.playersThatMadeBet).toEqual(['contestant-1'])

        await runScheduledTask(feature, state, scheduler, 'question.atom.complete')

        frame = getQuestionFrame(state)
        expect(frame.answeringStatus).toBe('answering')
        expect(frame.eligiblePlayerIds).toEqual(['contestant-1'])

        const ineligibleAnswerResult = await feature.handleAction(state, 'contestant-2', '$GiveAnswer', { text: 'Free answer' })

        expect(ineligibleAnswerResult).toMatchObject({
            code: 'invalid_answer_turn',
            success: false
        })

        expect((await feature.handleAction(state, 'contestant-1', '$GiveAnswer', { text: 'Risked answer' })).success).toBe(true)
        expect((await feature.handleAction(state, 'master', '$RateAnswer', { rating: 'declined' })).success).toBe(true)
        expect(state.members.find(member => member.id === 'contestant-1')?.playerScore).toBe(150)
    })

    it('collects for-all answers from multiple contestants and verifies them sequentially', async () => {
        const pack = createPackWithQuestions([
            createParamQuestion({
                price: '500',
                type: 'forAll',
                wrongAnswer: 'Wrong',
                params: [
                    {
                        _attributes: {
                            name: 'question',
                            type: 'content'
                        },
                        item: {
                            _text: 'For all question'
                        }
                    }
                ]
            }),
            createScenarioQuestion({
                price: '600'
            })
        ])
        const state = createState(pack, 2)
        const { feature, scheduler } = createFeatureHarness()

        await advanceToQuestion(feature, state, scheduler, '0-0-0')
        await runScheduledTask(feature, state, scheduler, 'question.atom.complete')

        let frame = getQuestionFrame(state)

        expect(frame.answeringStatus).toBe('answering')
        expect(frame.eligiblePlayerIds).toEqual(['contestant-1', 'contestant-2'])
        expect(frame.specialPhase).toBeUndefined()

        expect((await feature.handleAction(state, 'contestant-1', '$GiveAnswer', { text: 'A1' })).success).toBe(true)
        expect((await feature.handleAction(state, 'contestant-2', '$GiveAnswer', { text: 'A2' })).success).toBe(true)

        frame = getQuestionFrame(state)
        expect(frame.answeringStatus).toBe('answer-verifying')
        expect(state.game.session?.internal.currentAnsweringPlayerId).toBe('contestant-1')

        expect((await feature.handleAction(state, 'master', '$RateAnswer', { rating: 'approved' })).success).toBe(true)
        expect(state.members.find(member => member.id === 'contestant-1')?.playerScore).toBe(500)
        expect(state.game.session?.internal.currentAnsweringPlayerId).toBe('contestant-2')

        expect((await feature.handleAction(state, 'master', '$RateAnswer', { rating: 'declined' })).success).toBe(true)
        expect(state.members.find(member => member.id === 'contestant-2')?.playerScore).toBe(-500)
        frame = getQuestionFrame(state)
        expect(frame.specialPhase).toBe('showing-answer')
        expect(frame.content).toBe('Correct')

        await runScheduledTask(feature, state, scheduler, 'question.atom.complete')

        expect(state.game.session?.frame.id).toBe('question-board')
        expect((state.game.session?.frame as RealtimeJeopardyState.QuestionBoardFrame).pickerId).toBe('contestant-1')
    })

    it('ignores stale media-ended events after a media atom has already auto-advanced', async () => {
        const pack = createPackWithQuestions([
            createScenarioQuestionWithAtoms({
                atoms: [
                    {
                        _attributes: {
                            duration: '1',
                            type: 'video',
                            waitForFinish: 'False'
                        },
                        _text: 'clip.mp4'
                    }
                ],
                price: '300'
            })
        ])
        const state = createState(pack)
        const { feature, scheduler } = createFeatureHarness()

        await advanceToQuestion(feature, state, scheduler, '0-0-0')

        const mediaFrame = getQuestionFrame(state)
        const staleMediaPayload = {
            content: mediaFrame.content,
            mediaStartedAt: mediaFrame.mediaStartedAt,
            questionId: mediaFrame.questionId,
            type: mediaFrame.type
        }

        await runScheduledTask(feature, state, scheduler, 'question.atom.complete')

        expect(getQuestionFrame(state).answeringStatus).toBe('allowed')

        const staleMediaEndedResult = await feature.handleAction(state, 'contestant-1', '$MediaEnded', staleMediaPayload)

        expect(staleMediaEndedResult.success).toBe(true)
        expect(staleMediaEndedResult.stateChanged).toBe(false)
        expect(getQuestionFrame(state).answeringStatus).toBe('allowed')
    })

    it('keeps final betting open until every eligible contestant has made a bet', async () => {
        const state = createState(createFinalRoundPack(), 2)
        const { feature, scheduler } = createFeatureHarness()

        state.members.find(member => member.id === 'contestant-1')!.playerScore = 1000
        state.members.find(member => member.id === 'contestant-2')!.playerScore = 800

        await advanceToFinalBetting(feature, state, scheduler)

        let frame = state.game.session?.frame as RealtimeJeopardyState.FinalRoundBoardFrame
        expect(frame.status).toBe('betting')

        const firstBetResult = await feature.handleAction(state, 'contestant-1', '$MakeFinalBet', { value: 400 })

        expect(firstBetResult.success).toBe(true)
        frame = state.game.session?.frame as RealtimeJeopardyState.FinalRoundBoardFrame
        expect(frame.status).toBe('betting')
        expect(frame.playersThatMadeBet).toEqual(['contestant-1'])

        const secondBetResult = await feature.handleAction(state, 'contestant-2', '$MakeFinalBet', { value: 300 })

        expect(secondBetResult.success).toBe(true)
        frame = state.game.session?.frame as RealtimeJeopardyState.FinalRoundBoardFrame
        expect(frame.status).toBe('answering')
        expect(frame.playersThatMadeBet).toEqual(['contestant-1', 'contestant-2'])
    })

    it('keeps final answering open until every eligible contestant has submitted an answer', async () => {
        const state = createState(createFinalRoundPack(), 2)
        const { feature, scheduler } = createFeatureHarness()

        state.members.find(member => member.id === 'contestant-1')!.playerScore = 1000
        state.members.find(member => member.id === 'contestant-2')!.playerScore = 800

        await advanceToFinalBetting(feature, state, scheduler)
        expect((await feature.handleAction(state, 'contestant-1', '$MakeFinalBet', { value: 400 })).success).toBe(true)
        expect((await feature.handleAction(state, 'contestant-2', '$MakeFinalBet', { value: 300 })).success).toBe(true)

        let frame = state.game.session?.frame as RealtimeJeopardyState.FinalRoundBoardFrame
        expect(frame.status).toBe('answering')

        const firstAnswerResult = await feature.handleAction(state, 'contestant-1', '$GiveFinalAnswer', { answer: 'A1' })

        expect(firstAnswerResult.success).toBe(true)
        frame = state.game.session?.frame as RealtimeJeopardyState.FinalRoundBoardFrame
        expect(frame.status).toBe('answering')
        expect(frame.playersThatAnswered).toEqual(['contestant-1'])

        const secondAnswerResult = await feature.handleAction(state, 'contestant-2', '$GiveFinalAnswer', { answer: 'A2' })

        expect(secondAnswerResult.success).toBe(true)
        frame = state.game.session?.frame as RealtimeJeopardyState.FinalRoundBoardFrame
        expect(frame.status).toBe('answer-verifying')
        expect(frame.playersThatAnswered).toEqual(['contestant-1', 'contestant-2'])
    })

    it('applies final answer ratings to bets and shows the correct winner on the final score board', async () => {
        const state = createState(createFinalRoundPack(), 2)
        const { feature, scheduler } = createFeatureHarness()

        state.members.find(member => member.id === 'contestant-1')!.playerScore = 1000
        state.members.find(member => member.id === 'contestant-2')!.playerScore = 800

        await advanceToFinalBetting(feature, state, scheduler)
        expect((await feature.handleAction(state, 'contestant-1', '$MakeFinalBet', { value: 400 })).success).toBe(true)
        expect((await feature.handleAction(state, 'contestant-2', '$MakeFinalBet', { value: 300 })).success).toBe(true)
        expect((await feature.handleAction(state, 'contestant-1', '$GiveFinalAnswer', { answer: 'A1' })).success).toBe(true)
        expect((await feature.handleAction(state, 'contestant-2', '$GiveFinalAnswer', { answer: 'A2' })).success).toBe(true)

        const declineResult = await feature.handleAction(state, 'master', '$RateFinalAnswer', {
            answeringPlayerId: 'contestant-1',
            rate: 'declined'
        })
        const approveResult = await feature.handleAction(state, 'master', '$RateFinalAnswer', {
            answeringPlayerId: 'contestant-2',
            rate: 'approved'
        })

        expect(declineResult.success).toBe(true)
        expect(declineResult.action).toMatchObject({
            payload: {
                actionName: '$RateFinalAnswer',
                actionResult: {
                    answeringPlayerId: 'contestant-1',
                    rate: 'declined',
                    success: true
                }
            }
        })
        expect(approveResult.success).toBe(true)
        expect(approveResult.action).toMatchObject({
            payload: {
                actionName: '$RateFinalAnswer',
                actionResult: {
                    answeringPlayerId: 'contestant-2',
                    rate: 'approved',
                    success: true
                }
            }
        })
        expect(state.members.find(member => member.id === 'contestant-1')?.playerScore).toBe(600)
        expect(state.members.find(member => member.id === 'contestant-2')?.playerScore).toBe(1100)

        expect((await feature.handleAction(state, 'master', '$ShowFinalScores', null)).success).toBe(true)
        expect(state.game.session?.frame.id).toBe('final-score')
        expect((state.game.session?.frame as RealtimeJeopardyState.FinalScoreFrame).winner.id).toBe('contestant-2')
    })
})
