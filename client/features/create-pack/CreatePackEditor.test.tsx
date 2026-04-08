/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { CreatePackEditor } from './CreatePackEditor'
import { buildJeopardyPackArchiveFromDraft, createBoilerplateJeopardyPackDraft } from 'shared/lib/siqPackDraft'
import { getNormalizedQuestionById, parseJeopardyPackArchive } from 'shared/lib/jeopardyPack'

function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onerror = () => reject(reader.error)
        reader.onload = () => resolve(reader.result as ArrayBuffer)
        reader.readAsArrayBuffer(blob)
    })
}

describe('CreatePackEditor', () => {
    const createObjectUrlMock = jest.fn<string, [Blob]>(() => 'blob:pack')
    const revokeObjectUrlMock = jest.fn()
    const anchorClickMock = jest.fn()

    beforeEach(() => {
        createObjectUrlMock.mockClear()
        revokeObjectUrlMock.mockClear()
        anchorClickMock.mockClear()
        Object.defineProperty(URL, 'createObjectURL', {
            configurable: true,
            value: createObjectUrlMock
        })
        Object.defineProperty(URL, 'revokeObjectURL', {
            configurable: true,
            value: revokeObjectUrlMock
        })
        HTMLAnchorElement.prototype.click = anchorClickMock
    })

    it('saves edited packs as playable siq archives', async () => {
        render(<CreatePackEditor />)

        fireEvent.change(screen.getByLabelText('Pack name'), {
            target: {
                value: 'My Browser Pack'
            }
        })
        fireEvent.change(screen.getByLabelText('Accepted answers'), {
            target: {
                value: 'Caracal\nKarakal'
            }
        })

        fireEvent.click(screen.getByRole('button', { name: 'Save Pack' }))

        await waitFor(() => {
            expect(createObjectUrlMock).toHaveBeenCalledTimes(1)
        })

        const savedArchive = createObjectUrlMock.mock.calls[0]![0]
        expect(savedArchive).toBeTruthy()
        const parsed = await parseJeopardyPackArchive(await blobToArrayBuffer(savedArchive))
        const firstQuestion = getNormalizedQuestionById(parsed.declaration, '0-0-0')

        expect(anchorClickMock).toHaveBeenCalled()
        expect(revokeObjectUrlMock).toHaveBeenCalledWith('blob:pack')
        expect(parsed.packName).toBe('My Browser Pack')
        expect(firstQuestion?.correctAnswers).toEqual(['Caracal', 'Karakal'])
    })

    it('preserves whitespace while editing accepted and wrong answers', () => {
        render(<CreatePackEditor />)

        fireEvent.change(screen.getByLabelText('Accepted answers'), {
            target: {
                value: '  spaced answer  '
            }
        })
        fireEvent.change(screen.getByLabelText('Wrong answers'), {
            target: {
                value: '  wrong answer  '
            }
        })

        expect(screen.getByLabelText('Accepted answers')).toHaveValue('  spaced answer  ')
        expect(screen.getByLabelText('Wrong answers')).toHaveValue('  wrong answer  ')
    })

    it('opens existing packs and hydrates the editor fields from the archive', async () => {
        const draft = createBoilerplateJeopardyPackDraft()

        draft.name = 'Imported Pack'
        draft.author = 'Pack Author'
        draft.rounds[0]!.name = 'Round Zero'
        draft.rounds[0]!.themes[0]!.name = 'Imported Theme'
        draft.rounds[0]!.themes[0]!.questions[0]!.type = 'stake'
        draft.rounds[0]!.themes[0]!.questions[0]!.acceptedAnswers = ['Answer From File']

        const { archive } = await buildJeopardyPackArchiveFromDraft(draft)
        const file = new File([await blobToArrayBuffer(archive)], 'imported.siq', {
            type: 'application/octet-stream'
        })

        const { getByTestId } = render(<CreatePackEditor />)

        fireEvent.change(getByTestId('open-pack-input'), {
            target: {
                files: [file]
            }
        })

        await waitFor(() => {
            expect(screen.getByLabelText('Pack name')).toHaveValue('Imported Pack')
        })

        expect(screen.getByLabelText('Author')).toHaveValue('Pack Author')
        expect(within(screen.getAllByTestId(/outline-round-/)[0]!).getByLabelText('Round name')).toHaveValue('Round Zero')

        fireEvent.click(screen.getByRole('button', { name: 'Toggle round Round Zero' }))
        fireEvent.click(screen.getByRole('button', { name: 'Toggle theme Imported Theme' }))

        expect(within(screen.getAllByTestId(/outline-theme-/)[0]!).getByLabelText('Theme name')).toHaveValue('Imported Theme')
        expect(screen.getByLabelText('Accepted answers')).toHaveValue('Answer From File')
        expect(screen.getByText('Opened imported.siq.')).toBeInTheDocument()
    })

    it('reorders atoms by drag and drop inside a question section', () => {
        const { getByTestId } = render(<CreatePackEditor />)

        fireEvent.click(screen.getByRole('button', { name: 'Add Text atom to Atoms Before the Buzz' }))

        const atomList = getByTestId('atom-list-preBuzzAtoms')
        let textAreas = within(atomList).getAllByLabelText('Text atom content')

        fireEvent.change(textAreas[0]!, {
            target: {
                value: 'First atom'
            }
        })
        fireEvent.change(textAreas[1]!, {
            target: {
                value: 'Second atom'
            }
        })

        let atomRows = Array.from(atomList.querySelectorAll('[data-testid^="atom-row-preBuzzAtoms-"]'))

        fireEvent.dragStart(atomRows[1]!)
        fireEvent.drop(atomRows[0]!)
        fireEvent.dragEnd(atomRows[1]!)

        textAreas = within(atomList).getAllByLabelText('Text atom content')

        expect(textAreas[0]).toHaveValue('Second atom')
        expect(textAreas[1]).toHaveValue('First atom')
    })

    it('accepts dropped media files for media atoms', () => {
        render(<CreatePackEditor />)

        fireEvent.click(screen.getByRole('button', { name: 'Add Image atom to Atoms Before the Buzz' }))

        const dropZone = screen.getByText('Drop image here or use the picker above').closest('div')
        const file = new File(['image-bytes'], 'dropped.png', {
            type: 'image/png'
        })

        fireEvent.dragEnter(dropZone!, {
            dataTransfer: {
                files: [file]
            }
        })
        fireEvent.drop(dropZone!, {
            dataTransfer: {
                files: [file]
            }
        })

        expect(screen.getByText('dropped.png')).toBeInTheDocument()
    })

    it('keeps atom settings collapsed by default and opens them on demand', () => {
        render(<CreatePackEditor />)

        expect(screen.queryByText('Placement')).not.toBeInTheDocument()
        expect(screen.queryByText('Duration (seconds)')).not.toBeInTheDocument()

        fireEvent.click(screen.getAllByRole('button', { name: /Atom settings/i })[0]!)

        expect(screen.getByText('Placement')).toBeInTheDocument()
        expect(screen.getByText('Duration (seconds)')).toBeInTheDocument()
        expect(screen.getByText('Wait for finish')).toBeInTheDocument()
    })

    it('keeps nested outline accordions collapsed by default and edits round/theme names inside the outline headers', () => {
        render(<CreatePackEditor />)

        expect(screen.queryAllByTestId(/theme-question-list-/)).toHaveLength(0)

        const firstRound = screen.getAllByTestId(/outline-round-/)[0]!

        fireEvent.change(within(firstRound).getByLabelText('Round name'), {
            target: {
                value: 'Edited Round'
            }
        })

        expect(screen.getByRole('button', { name: 'Toggle round Edited Round' })).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Toggle round Edited Round' }))
        fireEvent.click(screen.getByRole('button', { name: 'Toggle theme Theme 1' }))

        const firstTheme = screen.getAllByTestId(/outline-theme-/)[0]!

        fireEvent.change(within(firstTheme).getByLabelText('Theme name'), {
            target: {
                value: 'Edited Theme'
            }
        })

        expect(screen.getByRole('button', { name: 'Toggle theme Edited Theme' })).toBeInTheDocument()
    })

    it('adds and deletes rounds and themes from the outline controls', () => {
        render(<CreatePackEditor />)

        fireEvent.click(screen.getByRole('button', { name: 'Add Round' }))

        expect(screen.getByRole('button', { name: 'Toggle round Round 4' })).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Add theme to Round 4' }))

        expect(screen.getByRole('button', { name: 'Toggle theme Theme 6' })).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Delete theme Theme 6' }))

        expect(screen.queryByRole('button', { name: 'Toggle theme Theme 6' })).not.toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: 'Delete round Round 4' }))

        expect(screen.queryByRole('button', { name: 'Toggle round Round 4' })).not.toBeInTheDocument()
    })

    it('reorders questions from the outline via drag and drop', () => {
        render(<CreatePackEditor />)

        fireEvent.click(screen.getByRole('button', { name: 'Toggle round Round 1' }))
        fireEvent.click(screen.getByRole('button', { name: 'Toggle theme Theme 1' }))

        const questionList = screen.getAllByTestId(/theme-question-list-/)[0]!
        const questionRows = Array.from(questionList.querySelectorAll('[data-testid^="question-row-"]'))

        fireEvent.dragStart(questionRows[1]!)
        fireEvent.drop(questionRows[0]!)
        fireEvent.dragEnd(questionRows[1]!)

        const reorderedRows = Array.from(questionList.querySelectorAll('[data-testid^="question-row-"]'))

        expect(reorderedRows[0]).toHaveTextContent('200')
        expect(reorderedRows[1]).toHaveTextContent('100')
    })

    it('deletes the selected question from the question card and keeps the selection on a remaining question', () => {
        render(<CreatePackEditor />)

        fireEvent.click(screen.getByRole('button', { name: 'Toggle round Round 1' }))
        fireEvent.click(screen.getByRole('button', { name: 'Toggle theme Theme 1' }))
        fireEvent.click(screen.getByRole('button', { name: 'Delete question 100 from Theme 1' }))

        expect(screen.queryByRole('button', { name: 'Select question 100 in Theme 1' })).not.toBeInTheDocument()
        expect(screen.getByLabelText('Question price')).toHaveValue(200)
    })

    it('keeps overrides collapsed when empty and lets them be opened manually', () => {
        render(<CreatePackEditor />)

        expect(screen.queryByLabelText('Question theme override input')).not.toBeInTheDocument()
        expect(screen.queryByLabelText('Answer duration override')).not.toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: /Overrides/i }))

        expect(screen.getByLabelText('Question theme override input')).toBeInTheDocument()
        expect(screen.getByLabelText('Answer duration override')).toBeInTheDocument()
    })
})
