import JSZip from 'jszip'
import xmlJs from 'xml-js'
import type { JeopardyDeclaration } from '../contracts/jeopardy'
import { getNormalizedQuestionById, parseJeopardyPackArchive } from './jeopardyPack'
import { buildJeopardyPackArchiveFromDraft, createBoilerplateJeopardyPackDraft, parseJeopardyPackDraftArchive } from './siqPackDraft'

describe('siqPackDraft', () => {
    it('creates the expected boilerplate pack structure', () => {
        const draft = createBoilerplateJeopardyPackDraft()
        const regularThemes = draft.rounds.slice(0, 3).flatMap(round => round.themes)
        const finalQuestions = draft.rounds[3]?.themes.flatMap(theme => theme.questions) || []

        expect(draft.rounds).toHaveLength(4)
        expect(draft.rounds.slice(0, 3).every(round => !round.isFinalRound)).toBe(true)
        expect(draft.rounds[3]?.isFinalRound).toBe(true)
        expect(regularThemes).toHaveLength(15)
        expect(draft.rounds[0]?.themes[0]?.questions.map(question => question.price)).toEqual([100, 200, 300, 400, 500])
        expect(draft.rounds[3]?.themes).toHaveLength(5)
        expect(finalQuestions).toHaveLength(5)
    })

    it('builds a playable siq archive from the draft model', async () => {
        const draft = createBoilerplateJeopardyPackDraft()
        const firstQuestion = draft.rounds[0]!.themes[0]!.questions[0]!

        draft.name = 'Browser Builder'
        draft.author = 'Codex'
        firstQuestion.type = 'secretPublicPrice'
        firstQuestion.questionTheme = 'Wild Cats'
        firstQuestion.selectionMode = 'any'
        firstQuestion.answerDurationMs = 22_000
        firstQuestion.priceRange = {
            max: 900,
            min: 500,
            step: 200
        }
        firstQuestion.acceptedAnswers = ['Caracal', 'Karakal']
        firstQuestion.wrongAnswers = ['Lynx']
        firstQuestion.preBuzzAtoms = [
            {
                assetId: null,
                content: 'Guess the cat',
                durationMs: 4_000,
                id: firstQuestion.preBuzzAtoms[0]!.id,
                placement: 'screen',
                type: 'text',
                waitForFinish: true
            },
            {
                assetId: 'asset-image',
                content: '',
                durationMs: 6_000,
                id: crypto.randomUUID(),
                placement: 'screen',
                type: 'image',
                waitForFinish: true
            }
        ]
        firstQuestion.postBuzzAtoms = [
            {
                assetId: null,
                content: '<strong>Caracal</strong>',
                durationMs: null,
                id: firstQuestion.postBuzzAtoms[0]!.id,
                placement: 'screen',
                type: 'html',
                waitForFinish: true
            }
        ]
        draft.assets = [
            {
                blob: new Blob(['fake-image'], { type: 'image/png' }),
                fileName: 'cat.png',
                id: 'asset-image'
            }
        ]

        const { archive } = await buildJeopardyPackArchiveFromDraft(draft)
        const parsed = await parseJeopardyPackArchive(await archive.arrayBuffer())
        const normalized = getNormalizedQuestionById(parsed.declaration, '0-0-0')

        expect(parsed.packName).toBe('Browser Builder')
        expect(parsed.author).toBe('Codex')
        expect(normalized).not.toBeNull()
        expect(normalized?.type).toBe('secretPublicPrice')
        expect(normalized?.questionTheme).toBe('Wild Cats')
        expect(normalized?.selectionMode).toBe('any')
        expect(normalized?.answerDurationMs).toBe(22_000)
        expect(normalized?.priceOptions).toEqual([500, 700, 900])
        expect(normalized?.correctAnswers).toEqual(['Caracal', 'Karakal'])
        expect(normalized?.incorrectAnswers).toEqual(['Lynx'])
        expect(normalized?.questionItems[1]).toMatchObject({
            content: expect.stringMatching(/cat\.png$/),
            isRef: true,
            type: 'image'
        })
        expect(normalized?.answerItems[0]).toMatchObject({
            content: '<strong>Caracal</strong>',
            type: 'html'
        })
    })

    it('imports an siq archive back into the editable draft model', async () => {
        const declaration: JeopardyDeclaration.Pack = {
            _declaration: {
                _attributes: {
                    encoding: 'utf-8',
                    version: '1.0'
                }
            },
            package: {
                _attributes: {
                    date: '07.04.2026',
                    difficulty: '1',
                    id: 'pack-1',
                    name: 'Legacy Import',
                    version: '4',
                    xmlns: 'http://vladimirkhil.com/ygpackage3.0.xsd'
                },
                info: {
                    authors: {
                        author: {
                            _text: 'Legacy Author'
                        }
                    }
                },
                rounds: {
                    round: [
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
                                        question: {
                                            _attributes: {
                                                price: '300',
                                                type: 'cat'
                                            },
                                            params: {
                                                param: [
                                                    {
                                                        _attributes: {
                                                            name: 'question'
                                                        },
                                                        item: [
                                                            {
                                                                _text: 'Look at the animal'
                                                            },
                                                            {
                                                                _attributes: {
                                                                    isRef: 'True',
                                                                    type: 'image'
                                                                },
                                                                _text: '@caracal.jpg'
                                                            }
                                                        ]
                                                    },
                                                    {
                                                        _attributes: {
                                                            name: 'answerDuration'
                                                        },
                                                        _text: '15'
                                                    },
                                                    {
                                                        _attributes: {
                                                            name: 'theme'
                                                        },
                                                        _text: 'Cats'
                                                    }
                                                ]
                                            },
                                            right: {
                                                answer: {
                                                    _text: 'Caracal'
                                                }
                                            },
                                            wrong: {
                                                answer: {
                                                    _text: 'Lynx'
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        }

        const zip = new JSZip()
        zip.file('content.xml', `<?xml version="1.0" encoding="utf-8"?>\n${xmlJs.js2xml(declaration, { compact: true, spaces: 2 })}`)
        zip.file('Images/caracal.jpg', new Uint8Array([1, 2, 3, 4]))

        const archive = await zip.generateAsync({
            compression: 'DEFLATE',
            type: 'arraybuffer'
        })

        const draft = await parseJeopardyPackDraftArchive(archive)
        const question = draft.rounds[0]!.themes[0]!.questions[0]!

        expect(draft.name).toBe('Legacy Import')
        expect(draft.author).toBe('Legacy Author')
        expect(question.type).toBe('secret')
        expect(question.questionTheme).toBe('Cats')
        expect(question.answerDurationMs).toBe(15_000)
        expect(question.acceptedAnswers).toEqual(['Caracal'])
        expect(question.wrongAnswers).toEqual(['Lynx'])
        expect(question.preBuzzAtoms).toHaveLength(2)
        expect(question.preBuzzAtoms[1]).toMatchObject({
            assetId: expect.any(String),
            type: 'image'
        })
        expect(draft.assets).toHaveLength(1)
        expect(draft.assets[0]?.fileName).toBe('caracal.jpg')
    })
})
