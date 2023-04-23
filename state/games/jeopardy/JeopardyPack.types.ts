export namespace JeopardyDeclaration {
    export interface QuestionScenarioAtomVideo {
        _attributes: {
            type: 'video'
        }
        _text: `@${string}.${string}"`
    }

    export interface QuestionScenarioAtomVoice {
        _attributes: {
            type: 'voice'
        }
        _text: `@${string}.${string}"`
    }

    export interface QuestionScenarioAtomImage {
        _attributes: {
            type: 'image'
        }
        _text: `@${string}.${string}"`
    }

    export interface QuestionScenarioAtomMarker {
        _attributes: {
            type: 'marker'
        }
    }

    export type QuestionScenarioAtom = QuestionScenarioAtomImage | QuestionScenarioAtomVoice | QuestionScenarioAtomVideo | QuestionScenarioAtomMarker

    export interface QuestionScenario {
        atom: QuestionScenarioAtom[]
    }

    export interface Question {
        _attributes: {
            price: `${number}`
        }
        scenario: QuestionScenario
        right: {
            answer: {
                _text: string
            }
        }
        wrong?: {
            answer: {
                _text: string
            }
        }
    }

    export interface Theme {
        _attributes: {
            name: string
        }
        questions: {
            question: Question[]
        }
    }

    export interface Round {
        _attributes: {
            name: string
            type?: 'final'
        }
        themes: {
            theme: Theme[]
        }
    }

    export interface Pack {
        _declaration: {
            _attributes: {
                version: `${number}.${number}`
                encoding: string
            }
        }
        package: {
            _attributes: {
                name: string
                version: `${number}`
                id: string
                date: `${number}.${number}.${number}`
                difficulty: `${number}.${number}`
                logo: `@${string}.${string}`
                xmlns: string
            }
        }
        info: {
            authors: {
                author: {
                    _text: string
                }
            }
        }
        rounds: {
            round: Round[]
        }
    }
}
