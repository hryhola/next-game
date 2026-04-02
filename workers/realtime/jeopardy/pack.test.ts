import fs from 'fs'
import path from 'path'
import { JeopardyDeclaration } from '../../../shared/contracts/jeopardy'
import { getNormalizedQuestionById, parseJeopardyPackArchive, validateJeopardyPackCompatibility } from './pack'

const cwd = process.cwd()

async function readPack(relativePath: string) {
    const filePath = path.join(cwd, relativePath)
    const buffer = fs.readFileSync(filePath)

    return parseJeopardyPackArchive(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
}

function createSingleQuestionPack(question: JeopardyDeclaration.Question): JeopardyDeclaration.Pack {
    return {
        _declaration: {
            _attributes: {
                encoding: 'utf-8',
                version: '1.0'
            }
        },
        package: {
            _attributes: {
                date: '01.04.2026',
                difficulty: '1',
                id: 'test-pack',
                name: 'Test pack',
                version: '4',
                xmlns: 'https://example.com/ygpackage'
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
                                question
                            }
                        }
                    }
                }
            }
        }
    }
}

describe('jeopardy pack parser', () => {
    it('parses the root legacy packs end-to-end', async () => {
        const rootPacks = ['УберПак1.siq', 'Музыкальный пак [Easy] by d9j.siq']

        for (const packPath of rootPacks) {
            const parsedPack = await readPack(packPath)

            expect(parsedPack.packName).toBeTruthy()
            expect(parsedPack.author).toBeTruthy()
            expect(validateJeopardyPackCompatibility(parsedPack.declaration)).toEqual({
                compatible: true
            })

            const normalizedQuestions: ReturnType<typeof getNormalizedQuestionById>[] = []

            for (let roundIndex = 0; ; roundIndex += 1) {
                let didFindRoundQuestion = false

                for (let themeIndex = 0; ; themeIndex += 1) {
                    let didFindThemeQuestion = false

                    for (let questionIndex = 0; ; questionIndex += 1) {
                        const questionId = `${roundIndex}-${themeIndex}-${questionIndex}` as const
                        const question = getNormalizedQuestionById(parsedPack.declaration, questionId)

                        if (!question) {
                            break
                        }

                        didFindRoundQuestion = true
                        didFindThemeQuestion = true
                        normalizedQuestions.push(question)
                    }

                    if (!didFindThemeQuestion) {
                        break
                    }
                }

                if (!didFindRoundQuestion) {
                    break
                }
            }

            expect(normalizedQuestions.length).toBeGreaterThan(0)
            expect(
                normalizedQuestions.every(
                    question => question.questionItems.length > 0 || question.answerItems.length > 0 || question.correctAnswers.length > 0
                )
            ).toBe(true)
        }
    })

    it('normalizes legacy SI aliases from the reference simulator pack', async () => {
        const parsedPack = await readPack('SI/test/SImulator/SImulator.ViewModel.Tests/Resources/1.siq')

        expect(getNormalizedQuestionById(parsedPack.declaration, '0-1-2')?.type).toBe('noRisk')
        expect(getNormalizedQuestionById(parsedPack.declaration, '0-4-3')?.type).toBe('secret')
        expect(getNormalizedQuestionById(parsedPack.declaration, '0-4-3')?.selectionMode).toBe('any')
        expect(getNormalizedQuestionById(parsedPack.declaration, '0-4-3')?.priceOptions).toEqual([700])
        expect(getNormalizedQuestionById(parsedPack.declaration, '0-4-4')?.type).toBe('stake')
    })

    it('reads params-based content items, timers, and price sets from the SI reference pack', async () => {
        const parsedPack = await readPack('SI/test/SIGame/SIGame.Tests/SIGameTestNew.siq')

        const secretQuestion = getNormalizedQuestionById(parsedPack.declaration, '0-0-4')
        const replicQuestion = getNormalizedQuestionById(parsedPack.declaration, '0-1-1')

        expect(secretQuestion?.type).toBe('secret')
        expect(secretQuestion?.priceOptions).toEqual([100, 300, 500, 700, 900])
        expect(replicQuestion?.questionItems[0]).toMatchObject({
            content: 'Это устный текст. Он появится в игре как реплика ведущего',
            placement: 'replic',
            type: 'text'
        })
        expect(replicQuestion?.questionItems[1]?.durationMs).toBe(8000)
    })

    it('ignores empty legacy scenario atoms before image clues in УберПак1', async () => {
        const parsedPack = await readPack('УберПак1.siq')
        const garfieldQuestion = getNormalizedQuestionById(parsedPack.declaration, '0-3-1')
        const lynxQuestion = getNormalizedQuestionById(parsedPack.declaration, '0-3-3')
        const caracalQuestion = getNormalizedQuestionById(parsedPack.declaration, '0-3-4')

        expect(garfieldQuestion?.questionItems).toEqual([
            expect.objectContaining({
                content: 'cat_4.jpg',
                type: 'image'
            })
        ])
        expect(lynxQuestion?.questionItems).toEqual([
            expect.objectContaining({
                content: 'cat_22.jpg',
                type: 'image'
            })
        ])
        expect(caracalQuestion?.questionItems).toEqual([
            expect.objectContaining({
                content: 'cat_3.jpg',
                type: 'image'
            })
        ])
    })

    it('normalizes legacy SI special aliases to the supported Jeopardy question types', () => {
        const pack = createSingleQuestionPack({
            _attributes: {
                price: '100',
                type: 'bagcat'
            },
            type: {
                _attributes: {
                    name: 'bagcat'
                },
                param: [
                    {
                        _attributes: {
                            name: 'knows'
                        },
                        _text: 'before'
                    }
                ]
            },
            right: {
                answer: {
                    _text: 'Answer'
                }
            },
            scenario: {
                atom: {
                    _text: 'Question'
                }
            }
        })

        const neverKnownPack = createSingleQuestionPack({
            _attributes: {
                price: '100',
                type: 'bagcat'
            },
            type: {
                _attributes: {
                    name: 'bagcat'
                },
                param: [
                    {
                        _attributes: {
                            name: 'knows'
                        },
                        _text: 'never'
                    }
                ]
            },
            right: {
                answer: {
                    _text: 'Answer'
                }
            },
            scenario: {
                atom: {
                    _text: 'Question'
                }
            }
        })

        const noRiskPack = createSingleQuestionPack({
            _attributes: {
                price: '200',
                type: 'sponsored'
            },
            right: {
                answer: {
                    _text: 'Answer'
                }
            },
            scenario: {
                atom: {
                    _text: 'Question'
                }
            }
        })

        const stakeAllPack = createSingleQuestionPack({
            _attributes: {
                price: '300',
                type: 'stakeAll'
            },
            right: {
                answer: {
                    _text: 'Answer'
                }
            },
            scenario: {
                atom: {
                    _text: 'Question'
                }
            }
        })

        expect(getNormalizedQuestionById(pack, '0-0-0')?.type).toBe('secretPublicPrice')
        expect(getNormalizedQuestionById(neverKnownPack, '0-0-0')?.type).toBe('secretNoQuestion')
        expect(getNormalizedQuestionById(noRiskPack, '0-0-0')?.type).toBe('noRisk')
        expect(getNormalizedQuestionById(noRiskPack, '0-0-0')?.priceMultiplier).toBe(2)
        expect(getNormalizedQuestionById(stakeAllPack, '0-0-0')?.type).toBe('stakeAll')
    })

    it('drops empty scenario atoms instead of turning them into blank text steps', () => {
        const pack = createSingleQuestionPack({
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
        })

        expect(getNormalizedQuestionById(pack, '0-0-0')?.questionItems).toEqual([
            expect.objectContaining({
                content: 'cat.jpg',
                type: 'image'
            })
        ])
    })

    it('marks SI custom question types as incompatible with a precise reason', () => {
        const compatibility = validateJeopardyPackCompatibility(
            createSingleQuestionPack({
                _attributes: {
                    price: '100',
                    type: 'custom'
                },
                right: {
                    answer: {
                        _text: 'Answer'
                    }
                },
                scenario: {
                    atom: {
                        _text: 'Question'
                    }
                }
            })
        )

        expect(compatibility).toEqual({
            compatible: false,
            reason: 'Round "Round 1", theme "Theme 1", question 100 uses the SI custom question type, which requires script handling that the current Jeopardy implementation does not support.'
        })
    })

    it('marks SI script steps as incompatible with a precise reason', () => {
        const compatibility = validateJeopardyPackCompatibility(
            createSingleQuestionPack({
                _attributes: {
                    price: '200'
                },
                right: {
                    answer: {
                        _text: 'Answer'
                    }
                },
                scenario: {
                    atom: {
                        _text: 'Question'
                    }
                },
                script: {
                    step: {
                        _attributes: {
                            type: 'setTheme'
                        }
                    }
                }
            })
        )

        expect(compatibility).toEqual({
            compatible: false,
            reason: 'Round "Round 1", theme "Theme 1", question 200 uses SI script steps (setTheme), which the current Jeopardy implementation does not support.'
        })
    })
})
