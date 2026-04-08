'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
    Button,
    Card,
    CardContent,
    CardHeader,
    Input,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Textarea
} from 'client/ui/primitives'
import { cn } from 'client/ui/lib/cn'
import {
    JEOPARDY_PACK_EDITOR_QUESTION_TYPES,
    buildJeopardyPackArchiveFromDraft,
    createBoilerplateJeopardyPackDraft,
    parseJeopardyPackDraftArchive,
    type JeopardyPackDraft,
    type JeopardyPackDraftAsset,
    type JeopardyPackDraftAtom,
    type JeopardyPackDraftAtomType,
    type JeopardyPackDraftQuestion
} from 'shared/lib/siqPackDraft'
import { ArrowLeft, ChevronDown, ChevronRight, FileArchive, GripVertical, ImageIcon, Music4, Plus, Save, Trash2, Upload, Video } from 'lucide-react'

type SelectedQuestionPath = {
    questionId: string
    roundId: string
    themeId: string
}

type DragState = {
    atomId: string
    section: AtomSectionKey
} | null

type AtomSectionKey = 'postBuzzAtoms' | 'preBuzzAtoms'

const QUESTION_TYPE_LABELS: Record<(typeof JEOPARDY_PACK_EDITOR_QUESTION_TYPES)[number], string> = {
    forAll: 'For All',
    forYourself: 'For Yourself',
    noRisk: 'No Risk',
    secret: 'Secret',
    secretNoQuestion: 'Secret Gift',
    secretPublicPrice: 'Secret Public Price',
    simple: 'Simple',
    stake: 'Stake',
    stakeAll: 'Stake for All'
}

const ATOM_TYPE_OPTIONS: { icon?: ReactNode; label: string; value: JeopardyPackDraftAtomType }[] = [
    { label: 'Text', value: 'text' },
    { label: 'HTML', value: 'html' },
    { icon: <ImageIcon className="size-4" />, label: 'Image', value: 'image' },
    { icon: <Video className="size-4" />, label: 'Video', value: 'video' },
    { icon: <Music4 className="size-4" />, label: 'Audio', value: 'voice' }
]

function createAtom(type: JeopardyPackDraftAtomType): JeopardyPackDraftAtom {
    return {
        assetId: null,
        content: type === 'html' ? '<p></p>' : '',
        durationMs: null,
        id: crypto.randomUUID(),
        placement: 'screen',
        type,
        waitForFinish: true
    }
}

function getFirstQuestionPath(draft: JeopardyPackDraft | null): SelectedQuestionPath | null {
    const round = draft?.rounds[0]
    const theme = round?.themes[0]
    const question = theme?.questions[0]

    if (!round || !theme || !question) {
        return null
    }

    return {
        questionId: question.id,
        roundId: round.id,
        themeId: theme.id
    }
}

function sanitizeDownloadName(name: string): string {
    const trimmed = name.trim() || 'jeopardy-pack'

    return `${trimmed.replace(/[^\w.-]+/g, '_')}.siq`
}

function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    if (typeof blob.arrayBuffer === 'function') {
        return blob.arrayBuffer()
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onerror = () => reject(reader.error)
        reader.onload = () => resolve(reader.result as ArrayBuffer)
        reader.readAsArrayBuffer(blob)
    })
}

function joinLines(values: string[]): string {
    return values.join('\n')
}

function splitLines(value: string): string[] {
    const lines = value.replace(/\r\n/g, '\n').split('\n').filter(Boolean)

    return lines.length ? lines : ['']
}

function findSelection(draft: JeopardyPackDraft | null, selection: SelectedQuestionPath | null) {
    if (!draft || !selection) {
        return null
    }

    const round = draft.rounds.find(entry => entry.id === selection.roundId)
    const theme = round?.themes.find(entry => entry.id === selection.themeId)
    const question = theme?.questions.find(entry => entry.id === selection.questionId)

    if (!round || !theme || !question) {
        return null
    }

    return { question, round, theme }
}

function replaceQuestion(
    draft: JeopardyPackDraft,
    selection: SelectedQuestionPath,
    updater: (question: JeopardyPackDraftQuestion, context: { roundIsFinal: boolean; roundName: string; themeName: string }) => JeopardyPackDraftQuestion
): JeopardyPackDraft {
    return {
        ...draft,
        rounds: draft.rounds.map(round =>
            round.id !== selection.roundId
                ? round
                : {
                      ...round,
                      themes: round.themes.map(theme =>
                          theme.id !== selection.themeId
                              ? theme
                              : {
                                    ...theme,
                                    questions: theme.questions.map(question =>
                                        question.id !== selection.questionId
                                            ? question
                                            : updater(question, {
                                                  roundIsFinal: round.isFinalRound,
                                                  roundName: round.name,
                                                  themeName: theme.name
                                              })
                                    )
                                }
                      )
                  }
        )
    }
}

function moveAtomBetweenSections(
    draft: JeopardyPackDraft,
    selection: SelectedQuestionPath,
    atomId: string,
    fromSection: AtomSectionKey,
    toSection: AtomSectionKey,
    targetAtomId?: string
): JeopardyPackDraft {
    return replaceQuestion(draft, selection, question => {
        const sourceAtoms = [...question[fromSection]]
        const movedAtomIndex = sourceAtoms.findIndex(atom => atom.id === atomId)

        if (movedAtomIndex < 0) {
            return question
        }

        const [movedAtom] = sourceAtoms.splice(movedAtomIndex, 1)

        if (!movedAtom) {
            return question
        }

        const destinationAtoms = fromSection === toSection ? sourceAtoms : [...question[toSection]]
        const targetIndex = targetAtomId ? destinationAtoms.findIndex(atom => atom.id === targetAtomId) : destinationAtoms.length
        const insertionIndex = targetIndex >= 0 ? targetIndex : destinationAtoms.length

        destinationAtoms.splice(insertionIndex, 0, movedAtom)

        if (fromSection === toSection) {
            return {
                ...question,
                [fromSection]: destinationAtoms
            }
        }

        return {
            ...question,
            [fromSection]: sourceAtoms,
            [toSection]: destinationAtoms
        }
    })
}

function moveQuestionWithinTheme(
    draft: JeopardyPackDraft,
    selection: {
        questionId: string
        roundId: string
        themeId: string
    },
    targetQuestionId?: string
): JeopardyPackDraft {
    return {
        ...draft,
        rounds: draft.rounds.map(round =>
            round.id !== selection.roundId
                ? round
                : {
                      ...round,
                      themes: round.themes.map(theme => {
                          if (theme.id !== selection.themeId) {
                              return theme
                          }

                          const sourceIndex = theme.questions.findIndex(question => question.id === selection.questionId)

                          if (sourceIndex < 0) {
                              return theme
                          }

                          const nextQuestions = [...theme.questions]
                          const [movedQuestion] = nextQuestions.splice(sourceIndex, 1)

                          if (!movedQuestion) {
                              return theme
                          }

                          const targetIndex = targetQuestionId ? nextQuestions.findIndex(question => question.id === targetQuestionId) : nextQuestions.length
                          const insertIndex = targetIndex >= 0 ? targetIndex : nextQuestions.length

                          nextQuestions.splice(insertIndex, 0, movedQuestion)

                          return {
                              ...theme,
                              questions: nextQuestions
                          }
                      })
                  }
        )
    }
}

function createRoundTemplate(roundName: string): JeopardyPackDraft['rounds'][number] {
    const template = createBoilerplateJeopardyPackDraft().rounds.find(round => !round.isFinalRound)

    if (!template) {
        throw new Error('Regular round template is not available')
    }

    return {
        ...template,
        name: roundName
    }
}

function createThemeTemplate(isFinalRound: boolean, themeName: string): JeopardyPackDraft['rounds'][number]['themes'][number] {
    const draft = createBoilerplateJeopardyPackDraft()
    const roundTemplate = isFinalRound ? draft.rounds.find(round => round.isFinalRound) : draft.rounds.find(round => !round.isFinalRound)
    const themeTemplate = roundTemplate?.themes[0]

    if (!themeTemplate) {
        throw new Error('Theme template is not available')
    }

    return {
        ...themeTemplate,
        name: themeName
    }
}

function createQuestionTemplate(price: number, type: JeopardyPackDraftQuestion['type'] = 'simple'): JeopardyPackDraftQuestion {
    return {
        acceptedAnswers: [''],
        answerDurationMs: null,
        id: crypto.randomUUID(),
        postBuzzAtoms: [createAtom('text')],
        preBuzzAtoms: [createAtom('text')],
        price,
        priceRange: {
            max: price,
            min: price,
            step: 100
        },
        questionTheme: '',
        selectionMode: 'exceptCurrent',
        type,
        wrongAnswers: []
    }
}

const AssetPreview: React.FC<{
    asset: JeopardyPackDraftAsset | null
    atomType: JeopardyPackDraftAtomType
}> = ({ asset, atomType }) => {
    const objectUrl = useMemo(() => (asset ? URL.createObjectURL(asset.blob) : null), [asset])

    useEffect(() => {
        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl)
            }
        }
    }, [objectUrl])

    if (!asset || !objectUrl) {
        return null
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/35">
            {atomType === 'image' ? <img alt={asset.fileName} className="max-h-48 w-full object-contain" src={objectUrl} /> : null}
            {atomType === 'video' ? <video className="max-h-56 w-full" controls src={objectUrl} /> : null}
            {atomType === 'voice' ? <audio className="w-full p-4" controls src={objectUrl} /> : null}
        </div>
    )
}

const AtomEditor: React.FC<{
    asset: JeopardyPackDraftAsset | null
    atom: JeopardyPackDraftAtom
    canDelete: boolean
    onChange: (patch: Partial<JeopardyPackDraftAtom>) => void
    onDelete: () => void
    onReplaceAsset: (file: File) => void
}> = ({ asset, atom, canDelete, onChange, onDelete, onReplaceAsset }) => {
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [isAssetDragOver, setIsAssetDragOver] = useState(false)

    const acceptPattern = atom.type === 'image' ? 'image/' : atom.type === 'video' ? 'video/' : 'audio/'

    const getAcceptedDroppedFile = (files: FileList | null | undefined): File | null => {
        const file = files?.[0]

        if (!file) {
            return null
        }

        return file.type.startsWith(acceptPattern) ? file : null
    }

    return (
        <Card className="border-white/12 bg-slate-950/28">
            <CardHeader className="gap-2 pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-sm font-semibold text-white">
                        <GripVertical className="size-4 text-slate-400" />
                        <span>Atom</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button disabled={!canDelete} onClick={onDelete} size="sm" type="button" variant="outlineDanger">
                            <Trash2 className="size-4" />
                            Delete
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={atom.type} onValueChange={value => onChange({ assetId: null, content: '', type: value as JeopardyPackDraftAtomType })}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {ATOM_TYPE_OPTIONS.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                    <span className="inline-flex items-center gap-2">
                                        {option.icon}
                                        {option.label}
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="rounded-[1.25rem] border border-white/10 bg-slate-950/18">
                    <button
                        className="glass-focus flex w-full items-center justify-between rounded-[1.25rem] px-3 py-2 text-left"
                        onClick={() => setIsSettingsOpen(current => !current)}
                        type="button"
                    >
                        <div className="min-w-0">
                            <div className="text-sm font-medium text-white">Atom settings</div>
                            <div className="truncate text-xs text-slate-300">
                                {atom.placement} / {atom.durationMs ? `${Math.round(atom.durationMs / 1000)}s` : 'auto'} /{' '}
                                {atom.waitForFinish ? 'wait for finish' : 'do not wait'}
                            </div>
                        </div>
                        {isSettingsOpen ? <ChevronDown className="size-4 text-slate-300" /> : <ChevronRight className="size-4 text-slate-300" />}
                    </button>
                    {isSettingsOpen ? (
                        <div className="grid gap-4 border-t border-white/10 px-3 pt-3 pb-3 md:grid-cols-2 xl:grid-cols-3">
                            <div className="space-y-2">
                                <Label>Placement</Label>
                                <Select value={atom.placement} onValueChange={value => onChange({ placement: value as JeopardyPackDraftAtom['placement'] })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="screen">Screen</SelectItem>
                                        <SelectItem value="replic">Replic</SelectItem>
                                        <SelectItem value="background">Background</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Duration (seconds)</Label>
                                <Input
                                    min={0}
                                    onChange={event =>
                                        onChange({
                                            durationMs: event.target.value ? Math.max(0, Number(event.target.value)) * 1000 : null
                                        })
                                    }
                                    type="number"
                                    value={atom.durationMs ? Math.round(atom.durationMs / 1000) : ''}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Wait for finish</Label>
                                <label className="glass-input glass-focus flex h-12 items-center gap-3 rounded-2xl px-4 text-sm text-slate-100">
                                    <input
                                        checked={atom.waitForFinish}
                                        className="size-4 accent-violet-400"
                                        onChange={event => onChange({ waitForFinish: event.target.checked })}
                                        type="checkbox"
                                    />
                                    <span>Auto-advance only after this atom finishes</span>
                                </label>
                            </div>
                        </div>
                    ) : null}
                </div>

                {atom.type === 'text' || atom.type === 'html' ? (
                    <div className="space-y-2">
                        <Label>{atom.type === 'html' ? 'HTML content' : 'Text content'}</Label>
                        <Textarea
                            className="min-h-24"
                            onChange={event => onChange({ content: event.target.value })}
                            placeholder={atom.type === 'html' ? '<p>Write HTML here</p>' : 'Write clue text here'}
                            aria-label={atom.type === 'html' ? 'HTML atom content' : 'Text atom content'}
                            value={atom.content}
                        />
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <Button onClick={() => fileInputRef.current?.click()} size="sm" type="button" variant="secondary">
                                <Upload className="size-4" />
                                Choose {atom.type === 'voice' ? 'Audio' : atom.type.charAt(0).toUpperCase() + atom.type.slice(1)}
                            </Button>
                            <span className="text-sm text-slate-300">{asset?.fileName || 'No file selected'}</span>
                        </div>
                        <input
                            accept={atom.type === 'image' ? 'image/*' : atom.type === 'video' ? 'video/*' : 'audio/*'}
                            className="hidden"
                            onChange={event => {
                                const file = event.target.files?.[0]

                                if (file) {
                                    onReplaceAsset(file)
                                }
                            }}
                            ref={fileInputRef}
                            type="file"
                        />
                        <div
                            className={cn(
                                'rounded-[1.4rem] border border-dashed border-white/10 p-2 transition',
                                isAssetDragOver ? 'border-violet-300/55 bg-violet-500/10 shadow-[0_0_0_1px_rgba(196,181,253,0.16)]' : 'bg-transparent'
                            )}
                            onDragEnter={event => {
                                event.preventDefault()
                                event.stopPropagation()

                                if (getAcceptedDroppedFile(event.dataTransfer?.files)) {
                                    setIsAssetDragOver(true)
                                }
                            }}
                            onDragLeave={event => {
                                event.preventDefault()
                                event.stopPropagation()

                                if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
                                    return
                                }

                                setIsAssetDragOver(false)
                            }}
                            onDragOver={event => {
                                event.preventDefault()
                                event.stopPropagation()

                                if (getAcceptedDroppedFile(event.dataTransfer?.files)) {
                                    event.dataTransfer.dropEffect = 'copy'
                                    setIsAssetDragOver(true)
                                }
                            }}
                            onDrop={event => {
                                event.preventDefault()
                                event.stopPropagation()
                                setIsAssetDragOver(false)

                                const file = getAcceptedDroppedFile(event.dataTransfer?.files)

                                if (file) {
                                    onReplaceAsset(file)
                                }
                            }}
                        >
                            <AssetPreview asset={asset} atomType={atom.type} />
                            <div className="px-2 pt-2 text-center text-xs text-slate-300">
                                Drop {atom.type === 'voice' ? 'audio' : atom.type} here or use the picker above
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

const AtomListEditor: React.FC<{
    assets: JeopardyPackDraftAsset[]
    atoms: JeopardyPackDraftAtom[]
    canDeleteLastAtom: boolean
    dragState: DragState
    onAddAtom: (type: JeopardyPackDraftAtomType) => void
    onChangeAtom: (atomId: string, patch: Partial<JeopardyPackDraftAtom>) => void
    onDeleteAtom: (atomId: string) => void
    onDropAtom: (targetAtomId?: string) => void
    onEndDragging: () => void
    onReplaceAsset: (atomId: string, file: File) => void
    onStartDragging: (atomId: string) => void
    section: AtomSectionKey
    title: string
}> = ({
    assets,
    atoms,
    canDeleteLastAtom,
    dragState,
    onAddAtom,
    onChangeAtom,
    onDeleteAtom,
    onDropAtom,
    onEndDragging,
    onReplaceAsset,
    onStartDragging,
    section,
    title
}) => {
    return (
        <Card className="h-fit">
            <CardHeader className="gap-3 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-white">{title}</h3>
                    <div className="flex flex-wrap items-center gap-2">
                        {ATOM_TYPE_OPTIONS.map(option => (
                            <Button
                                aria-label={`Add ${option.label} atom to ${title}`}
                                key={option.value}
                                onClick={() => onAddAtom(option.value)}
                                size="sm"
                                type="button"
                                variant="ghost"
                            >
                                <Plus className="size-4" />
                                {option.label}
                            </Button>
                        ))}
                    </div>
                </div>
            </CardHeader>
            <CardContent
                className={cn(
                    'space-y-4 rounded-[1.75rem] border border-dashed border-white/10 bg-slate-950/20 pt-6 transition-colors',
                    dragState ? 'border-violet-300/40 bg-violet-500/5' : null
                )}
                data-testid={`atom-list-${section}`}
                onDragOver={event => event.preventDefault()}
                onDrop={event => {
                    event.preventDefault()
                    event.stopPropagation()
                    onDropAtom()
                }}
            >
                {atoms.map(atom => {
                    const asset = atom.assetId ? assets.find(entry => entry.id === atom.assetId) || null : null

                    return (
                        <div
                            data-testid={`atom-row-${section}-${atom.id}`}
                            draggable
                            key={atom.id}
                            onDragEnd={onEndDragging}
                            onDragStart={() => onStartDragging(atom.id)}
                            onDragOver={event => event.preventDefault()}
                            onDrop={event => {
                                event.preventDefault()
                                event.stopPropagation()
                                onDropAtom(atom.id)
                            }}
                        >
                            <AtomEditor
                                asset={asset}
                                atom={atom}
                                canDelete={canDeleteLastAtom || atoms.length > 1 || section === 'postBuzzAtoms'}
                                onChange={patch => onChangeAtom(atom.id, patch)}
                                onDelete={() => onDeleteAtom(atom.id)}
                                onReplaceAsset={file => onReplaceAsset(atom.id, file)}
                            />
                        </div>
                    )
                })}
            </CardContent>
        </Card>
    )
}

export const CreatePackEditor: React.FC = () => {
    const fileInputRef = useRef<HTMLInputElement | null>(null)
    const initialDraft = useMemo(() => createBoilerplateJeopardyPackDraft(), [])
    const [draft, setDraft] = useState<JeopardyPackDraft>(initialDraft)
    const [selection, setSelection] = useState<SelectedQuestionPath | null>(getFirstQuestionPath(initialDraft))
    const [error, setError] = useState<string | null>(null)
    const [status, setStatus] = useState<string>('Boilerplate pack created. You can start editing immediately.')
    const [dragState, setDragState] = useState<DragState>(null)
    const [questionDragState, setQuestionDragState] = useState<SelectedQuestionPath | null>(null)
    const [isBusy, setIsBusy] = useState(false)
    const [openRoundIds, setOpenRoundIds] = useState<string[]>([])
    const [openThemeIds, setOpenThemeIds] = useState<string[]>([])
    const [isPackDetailsOpen, setIsPackDetailsOpen] = useState(true)
    const [questionOverridesOpenByQuestionId, setQuestionOverridesOpenByQuestionId] = useState<Record<string, boolean>>({})

    const selected = findSelection(draft, selection)

    const hasQuestionOverrides = selected?.question ? Boolean(selected.question.questionTheme.trim()) || selected.question.answerDurationMs !== null : false
    const isQuestionOverridesVisible = selected?.question ? hasQuestionOverrides || Boolean(questionOverridesOpenByQuestionId[selected.question.id]) : false

    const isRoundOpen = (roundId: string) => openRoundIds.includes(roundId)
    const isThemeOpen = (themeId: string) => openThemeIds.includes(themeId)

    const setOutlinePathOpen = (roundId: string, themeId?: string) => {
        setOpenRoundIds(current => (current.includes(roundId) ? current : [...current, roundId]))

        if (themeId) {
            setOpenThemeIds(current => (current.includes(themeId) ? current : [...current, themeId]))
        }
    }

    const toggleRoundOpen = (roundId: string) => {
        setOpenRoundIds(current => (current.includes(roundId) ? current.filter(id => id !== roundId) : [...current, roundId]))
    }

    const toggleThemeOpen = (themeId: string) => {
        setOpenThemeIds(current => (current.includes(themeId) ? current.filter(id => id !== themeId) : [...current, themeId]))
    }

    const setSelectionAndOpen = (nextSelection: SelectedQuestionPath) => {
        setSelection(nextSelection)
        setOutlinePathOpen(nextSelection.roundId, nextSelection.themeId)
    }

    const getFallbackSelection = (nextDraft: JeopardyPackDraft, preferredSelection: SelectedQuestionPath | null): SelectedQuestionPath | null => {
        if (preferredSelection) {
            const preferredRound = nextDraft.rounds.find(round => round.id === preferredSelection.roundId)
            const preferredTheme = preferredRound?.themes.find(theme => theme.id === preferredSelection.themeId)
            const preferredQuestion = preferredTheme?.questions.find(question => question.id === preferredSelection.questionId)

            if (preferredRound && preferredTheme && preferredQuestion) {
                return preferredSelection
            }
        }

        return getFirstQuestionPath(nextDraft)
    }

    const handleCreateNewPack = () => {
        const nextDraft = createBoilerplateJeopardyPackDraft()

        setDraft(nextDraft)
        setSelection(getFirstQuestionPath(nextDraft))
        setError(null)
        setOpenRoundIds([])
        setOpenThemeIds([])
        setQuestionOverridesOpenByQuestionId({})
        setStatus('Created a fresh boilerplate pack.')
    }

    const handleOpenPack = async (file: File) => {
        setIsBusy(true)
        setError(null)

        try {
            const openedDraft = await parseJeopardyPackDraftArchive(await readBlobAsArrayBuffer(file))

            setDraft(openedDraft)
            setSelection(getFirstQuestionPath(openedDraft))
            setOpenRoundIds([])
            setOpenThemeIds([])
            setQuestionOverridesOpenByQuestionId({})
            setStatus(`Opened ${file.name}.`)
        } catch (caughtError) {
            setError(caughtError instanceof Error ? caughtError.message : String(caughtError))
        } finally {
            setIsBusy(false)
        }
    }

    const handleSavePack = async () => {
        if (!draft) {
            return
        }

        setIsBusy(true)
        setError(null)

        try {
            const { archive } = await buildJeopardyPackArchiveFromDraft(draft)
            const objectUrl = URL.createObjectURL(archive)
            const anchor = document.createElement('a')

            anchor.href = objectUrl
            anchor.download = sanitizeDownloadName(draft.name)
            anchor.click()

            URL.revokeObjectURL(objectUrl)
            setStatus(`Saved ${anchor.download}.`)
        } catch (caughtError) {
            setError(caughtError instanceof Error ? caughtError.message : String(caughtError))
        } finally {
            setIsBusy(false)
        }
    }

    const updateDraftQuestion = (updater: Parameters<typeof replaceQuestion>[2]) => {
        if (!draft || !selection) {
            return
        }

        setDraft(currentDraft => (currentDraft ? replaceQuestion(currentDraft, selection, updater) : currentDraft))
    }

    const handleAddRound = () => {
        const regularRoundCount = draft.rounds.filter(round => !round.isFinalRound).length
        const nextRound = createRoundTemplate(`Round ${regularRoundCount + 1}`)
        const finalRoundIndex = draft.rounds.findIndex(round => round.isFinalRound)
        const insertionIndex = finalRoundIndex >= 0 ? finalRoundIndex : draft.rounds.length
        const nextDraft = {
            ...draft,
            rounds: [...draft.rounds.slice(0, insertionIndex), nextRound, ...draft.rounds.slice(insertionIndex)]
        }
        const nextSelection = getFirstQuestionPath({
            ...draft,
            rounds: [nextRound]
        })

        setDraft(nextDraft)

        if (nextSelection) {
            setSelectionAndOpen({
                ...nextSelection,
                roundId: nextRound.id,
                themeId: nextRound.themes[0]!.id,
                questionId: nextRound.themes[0]!.questions[0]!.id
            })
        }

        setStatus(`Added ${nextRound.name}.`)
    }

    const handleDeleteRound = (roundId: string) => {
        const round = draft.rounds.find(entry => entry.id === roundId)
        const regularRounds = draft.rounds.filter(entry => !entry.isFinalRound)

        if (!round) {
            return
        }

        if (round.isFinalRound) {
            setStatus('The final round cannot be deleted.')
            return
        }

        if (regularRounds.length <= 1) {
            setStatus('The pack needs at least one regular round.')
            return
        }

        const nextDraft = {
            ...draft,
            rounds: draft.rounds.filter(entry => entry.id !== roundId)
        }

        setDraft(nextDraft)
        setSelection(getFallbackSelection(nextDraft, selection?.roundId === roundId ? null : selection))
        setOpenRoundIds(current => current.filter(id => id !== roundId))
        setOpenThemeIds(current => current.filter(id => !round.themes.some(theme => theme.id === id)))
        setStatus(`Deleted ${round.name}.`)
    }

    const handleAddTheme = (roundId: string) => {
        const round = draft.rounds.find(entry => entry.id === roundId)

        if (!round) {
            return
        }

        const nextTheme = createThemeTemplate(round.isFinalRound, `${round.isFinalRound ? 'Final Theme' : 'Theme'} ${round.themes.length + 1}`)
        const nextDraft = {
            ...draft,
            rounds: draft.rounds.map(entry =>
                entry.id === roundId
                    ? {
                          ...entry,
                          themes: [...entry.themes, nextTheme]
                      }
                    : entry
            )
        }

        setDraft(nextDraft)
        setSelectionAndOpen({
            questionId: nextTheme.questions[0]!.id,
            roundId,
            themeId: nextTheme.id
        })
        setStatus(`Added ${nextTheme.name}.`)
    }

    const handleAddQuestion = (roundId: string, themeId: string) => {
        const round = draft.rounds.find(entry => entry.id === roundId)
        const theme = round?.themes.find(entry => entry.id === themeId)

        if (!round || !theme) {
            return
        }

        const nextPrice = round.isFinalRound ? 0 : Math.max(100, ...theme.questions.map(question => question.price)) + 100
        const nextQuestion = createQuestionTemplate(nextPrice)
        const nextDraft = {
            ...draft,
            rounds: draft.rounds.map(entry =>
                entry.id !== roundId
                    ? entry
                    : {
                          ...entry,
                          themes: entry.themes.map(item =>
                              item.id !== themeId
                                  ? item
                                  : {
                                        ...item,
                                        questions: [...item.questions, nextQuestion]
                                    }
                          )
                      }
            )
        }

        setDraft(nextDraft)
        setSelectionAndOpen({
            questionId: nextQuestion.id,
            roundId,
            themeId
        })
        setStatus(`Added ${round.isFinalRound ? 'a final question' : `question ${nextQuestion.price}`} to ${theme.name}.`)
    }

    const handleDeleteTheme = (roundId: string, themeId: string) => {
        const round = draft.rounds.find(entry => entry.id === roundId)
        const theme = round?.themes.find(entry => entry.id === themeId)

        if (!round || !theme) {
            return
        }

        if (round.themes.length <= 1) {
            setStatus('Each round needs at least one theme.')
            return
        }

        const nextDraft = {
            ...draft,
            rounds: draft.rounds.map(entry =>
                entry.id !== roundId
                    ? entry
                    : {
                          ...entry,
                          themes: entry.themes.filter(item => item.id !== themeId)
                      }
            )
        }

        setDraft(nextDraft)
        setSelection(getFallbackSelection(nextDraft, selection?.themeId === themeId ? null : selection))
        setOpenThemeIds(current => current.filter(id => id !== themeId))
        setStatus(`Deleted ${theme.name}.`)
    }

    const handleDeleteQuestion = (roundId: string, themeId: string, questionId: string) => {
        const round = draft.rounds.find(entry => entry.id === roundId)
        const theme = round?.themes.find(entry => entry.id === themeId)
        const question = theme?.questions.find(entry => entry.id === questionId)

        if (!round || !theme || !question) {
            return
        }

        if (theme.questions.length <= 1) {
            setStatus('Each theme needs at least one question.')
            return
        }

        const nextDraft = {
            ...draft,
            rounds: draft.rounds.map(entry =>
                entry.id !== roundId
                    ? entry
                    : {
                          ...entry,
                          themes: entry.themes.map(item =>
                              item.id !== themeId
                                  ? item
                                  : {
                                        ...item,
                                        questions: item.questions.filter(currentQuestion => currentQuestion.id !== questionId)
                                    }
                          )
                      }
            )
        }
        const nextTheme = nextDraft.rounds.find(entry => entry.id === roundId)?.themes.find(entry => entry.id === themeId)
        const nextQuestion = nextTheme?.questions[0]
        const nextSelection =
            selection?.questionId === questionId && nextQuestion
                ? {
                      questionId: nextQuestion.id,
                      roundId,
                      themeId
                  }
                : getFallbackSelection(nextDraft, selection)

        setDraft(nextDraft)
        setQuestionOverridesOpenByQuestionId(current => {
            const next = { ...current }
            delete next[questionId]

            return next
        })

        if (nextSelection) {
            setSelectionAndOpen(nextSelection)
        } else {
            setSelection(null)
        }

        setStatus(`Deleted ${round.isFinalRound ? 'the final question' : `question ${question.price}`} from ${theme.name}.`)
    }

    const addAtom = (section: AtomSectionKey, type: JeopardyPackDraftAtomType) => {
        updateDraftQuestion(question => ({
            ...question,
            [section]: [...question[section], createAtom(type)]
        }))
    }

    const updateAtom = (section: AtomSectionKey, atomId: string, patch: Partial<JeopardyPackDraftAtom>) => {
        updateDraftQuestion(question => ({
            ...question,
            [section]: question[section].map(atom => (atom.id === atomId ? { ...atom, ...patch } : atom))
        }))
    }

    const deleteAtom = (section: AtomSectionKey, atomId: string) => {
        if (section === 'preBuzzAtoms' && selected?.question.preBuzzAtoms.length === 1) {
            setStatus('Every question needs at least one pre-buzz atom.')
            return
        }

        updateDraftQuestion(question => ({
            ...question,
            [section]: question[section].filter(atom => atom.id !== atomId)
        }))
    }

    const replaceAtomAsset = (section: AtomSectionKey, atomId: string, file: File) => {
        if (!selection) {
            return
        }

        const assetId = crypto.randomUUID()

        setDraft(currentDraft =>
            currentDraft
                ? replaceQuestion(
                      {
                          ...currentDraft,
                          assets: [
                              ...currentDraft.assets,
                              {
                                  blob: file,
                                  fileName: file.name,
                                  id: assetId
                              }
                          ]
                      },
                      selection,
                      question => ({
                          ...question,
                          [section]: question[section].map(atom => (atom.id === atomId ? { ...atom, assetId, content: '' } : atom))
                      })
                  )
                : currentDraft
        )
    }

    const handleDropIntoSection = (section: AtomSectionKey, targetAtomId?: string) => {
        if (!draft || !selection || !dragState) {
            return
        }

        if (dragState.section === 'preBuzzAtoms' && section !== 'preBuzzAtoms' && (selected?.question.preBuzzAtoms.length || 0) <= 1) {
            setStatus('Every question needs at least one pre-buzz atom.')
            setDragState(null)
            return
        }

        setDraft(currentDraft =>
            currentDraft ? moveAtomBetweenSections(currentDraft, selection, dragState.atomId, dragState.section, section, targetAtomId) : currentDraft
        )
        setDragState(null)
    }

    const showSpecialValueRange =
        selected?.question.type === 'secret' ||
        selected?.question.type === 'secretNoQuestion' ||
        selected?.question.type === 'secretPublicPrice' ||
        selected?.question.type === 'stake'

    const showSelectionMode =
        selected?.question.type === 'secret' || selected?.question.type === 'secretNoQuestion' || selected?.question.type === 'secretPublicPrice'

    return (
        <div className="h-[var(--fullHeight)] overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.16),transparent_40%),linear-gradient(180deg,#0b1024,#050816)]">
            <div className="mx-auto flex min-h-full max-w-[1700px] flex-col gap-6 p-4 lg:flex-row lg:p-6">
                <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-[24rem]">
                    <Card>
                        <CardHeader className="gap-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.35em] text-violet-200/55">Pack Studio</p>
                                    <h1 className="mt-2 text-2xl font-semibold text-white">Create SIQ Pack</h1>
                                </div>
                                <Button asChild size="sm" type="button" variant="ghost">
                                    <Link href="/home">
                                        <ArrowLeft className="size-4" />
                                        Home
                                    </Link>
                                </Button>
                            </div>
                            <p className="text-sm leading-6 text-slate-300">
                                Create a boilerplate pack, open an existing <code>.siq</code>, edit every question, then save a new pack right in the browser.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <Button disabled={isBusy} onClick={handleCreateNewPack} type="button">
                                    <Plus className="size-4" />
                                    New Boilerplate
                                </Button>
                                <Button disabled={isBusy} onClick={() => fileInputRef.current?.click()} type="button" variant="secondary">
                                    <FileArchive className="size-4" />
                                    Open Pack
                                </Button>
                                <Button disabled={isBusy} onClick={handleSavePack} type="button" variant="outline">
                                    <Save className="size-4" />
                                    Save Pack
                                </Button>
                            </div>
                            <input
                                accept=".siq,application/octet-stream"
                                className="hidden"
                                data-testid="open-pack-input"
                                onChange={event => {
                                    const file = event.target.files?.[0]

                                    if (file) {
                                        void handleOpenPack(file)
                                    }
                                }}
                                ref={fileInputRef}
                                type="file"
                            />
                        </CardHeader>
                    </Card>

                    {error ? <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

                    {status ? (
                        <div className="rounded-2xl border border-emerald-300/15 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-100">{status}</div>
                    ) : null}

                    <Card className="min-h-0 flex-1 overflow-hidden">
                        <CardHeader className="pb-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-semibold text-white">Outline</h2>
                                    <p className="text-sm text-slate-300">
                                        Rounds and themes are nested accordions. Expand what you need and drag questions to reorder them.
                                    </p>
                                </div>
                                <Button onClick={handleAddRound} size="sm" type="button" variant="secondary">
                                    <Plus className="size-4" />
                                    Add Round
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3 overflow-y-auto pb-6">
                            {draft.rounds.map(round => {
                                const roundOpen = isRoundOpen(round.id)

                                return (
                                    <div className="space-y-2" data-testid={`outline-round-${round.id}`} key={round.id}>
                                        <div className="flex items-start gap-2">
                                            <button
                                                aria-label={`Toggle round ${round.name}`}
                                                className="glass-focus mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-100 hover:bg-violet-500/16"
                                                onClick={() => toggleRoundOpen(round.id)}
                                                type="button"
                                            >
                                                {roundOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                                            </button>
                                            <div className="min-w-0 flex-1">
                                                <Input
                                                    aria-label="Round name"
                                                    className="h-auto rounded-none border-0 bg-transparent px-0 py-0 text-base font-semibold shadow-none placeholder:text-slate-500"
                                                    onChange={event => {
                                                        const nextName = event.target.value

                                                        setDraft(currentDraft => ({
                                                            ...currentDraft,
                                                            rounds: currentDraft.rounds.map(entry =>
                                                                entry.id === round.id ? { ...entry, name: nextName } : entry
                                                            )
                                                        }))
                                                    }}
                                                    value={round.name}
                                                />
                                                {round.isFinalRound ? (
                                                    <div className="mt-0.5 text-[0.6em] uppercase tracking-[0.22em] text-violet-200/70">Final Round</div>
                                                ) : null}
                                            </div>
                                            <Button
                                                aria-label={`Add theme to ${round.name}`}
                                                className="w-9 px-0 [&_svg]:size-5"
                                                onClick={() => handleAddTheme(round.id)}
                                                size="sm"
                                                type="button"
                                                variant="ghost"
                                            >
                                                <Plus />
                                            </Button>
                                            {!round.isFinalRound ? (
                                                <Button
                                                    aria-label={`Delete round ${round.name}`}
                                                    className="w-9 px-0 [&_svg]:size-5"
                                                    onClick={() => handleDeleteRound(round.id)}
                                                    size="sm"
                                                    type="button"
                                                    variant="outlineDanger"
                                                >
                                                    <Trash2 />
                                                </Button>
                                            ) : null}
                                        </div>

                                        {roundOpen ? (
                                            <div className="ml-6 space-y-2">
                                                <div className="space-y-2">
                                                    {round.themes.map(theme => {
                                                        const themeOpen = isThemeOpen(theme.id)

                                                        return (
                                                            <div className="space-y-2" data-testid={`outline-theme-${theme.id}`} key={theme.id}>
                                                                <div className="flex items-start gap-2">
                                                                    <button
                                                                        aria-label={`Toggle theme ${theme.name}`}
                                                                        className="glass-focus mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/16"
                                                                        onClick={() => toggleThemeOpen(theme.id)}
                                                                        type="button"
                                                                    >
                                                                        {themeOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                                                                    </button>
                                                                    <div className="min-w-0 flex-1">
                                                                        <Input
                                                                            aria-label="Theme name"
                                                                            className="h-auto rounded-none border-0 bg-transparent px-0 py-0 text-sm font-medium text-slate-100 shadow-none placeholder:text-slate-500"
                                                                            onChange={event => {
                                                                                const nextName = event.target.value

                                                                                setDraft(currentDraft => ({
                                                                                    ...currentDraft,
                                                                                    rounds: currentDraft.rounds.map(entry =>
                                                                                        entry.id !== round.id
                                                                                            ? entry
                                                                                            : {
                                                                                                  ...entry,
                                                                                                  themes: entry.themes.map(item =>
                                                                                                      item.id === theme.id ? { ...item, name: nextName } : item
                                                                                                  )
                                                                                              }
                                                                                    )
                                                                                }))
                                                                            }}
                                                                            value={theme.name}
                                                                        />
                                                                    </div>
                                                                    <Button
                                                                        aria-label={`Add question to ${theme.name}`}
                                                                        className="w-9 px-0 [&_svg]:size-5"
                                                                        onClick={() => handleAddQuestion(round.id, theme.id)}
                                                                        size="sm"
                                                                        type="button"
                                                                        variant="ghost"
                                                                    >
                                                                        <Plus />
                                                                    </Button>
                                                                    <Button
                                                                        aria-label={`Delete theme ${theme.name}`}
                                                                        className="w-9 px-0 [&_svg]:size-5"
                                                                        onClick={() => handleDeleteTheme(round.id, theme.id)}
                                                                        size="sm"
                                                                        type="button"
                                                                        variant="ghost"
                                                                    >
                                                                        <Trash2 />
                                                                    </Button>
                                                                </div>

                                                                {themeOpen ? (
                                                                    <div className="ml-6">
                                                                        <div
                                                                            className="flex flex-wrap gap-2"
                                                                            data-testid={`theme-question-list-${theme.id}`}
                                                                            onDragOver={event => event.preventDefault()}
                                                                            onDrop={event => {
                                                                                event.preventDefault()
                                                                                event.stopPropagation()

                                                                                if (!questionDragState) {
                                                                                    return
                                                                                }

                                                                                if (
                                                                                    questionDragState.roundId !== round.id ||
                                                                                    questionDragState.themeId !== theme.id
                                                                                ) {
                                                                                    setQuestionDragState(null)
                                                                                    return
                                                                                }

                                                                                setDraft(currentDraft =>
                                                                                    moveQuestionWithinTheme(currentDraft, questionDragState)
                                                                                )
                                                                                setQuestionDragState(null)
                                                                            }}
                                                                        >
                                                                            {theme.questions.map(question => {
                                                                                const isSelected =
                                                                                    selection?.roundId === round.id &&
                                                                                    selection?.themeId === theme.id &&
                                                                                    selection?.questionId === question.id
                                                                                const questionLabel = round.isFinalRound
                                                                                    ? `final question in ${theme.name}`
                                                                                    : `question ${question.price} in ${theme.name}`
                                                                                const questionTypeLabel =
                                                                                    question.type === 'simple' ? null : QUESTION_TYPE_LABELS[question.type]

                                                                                return (
                                                                                    <div
                                                                                        data-testid={`question-row-${question.id}`}
                                                                                        draggable
                                                                                        key={question.id}
                                                                                        onDragEnd={() => setQuestionDragState(null)}
                                                                                        onDragStart={() =>
                                                                                            setQuestionDragState({
                                                                                                questionId: question.id,
                                                                                                roundId: round.id,
                                                                                                themeId: theme.id
                                                                                            })
                                                                                        }
                                                                                        onDragOver={event => event.preventDefault()}
                                                                                        onDrop={event => {
                                                                                            event.preventDefault()
                                                                                            event.stopPropagation()

                                                                                            if (!questionDragState) {
                                                                                                return
                                                                                            }

                                                                                            if (
                                                                                                questionDragState.roundId !== round.id ||
                                                                                                questionDragState.themeId !== theme.id
                                                                                            ) {
                                                                                                setQuestionDragState(null)
                                                                                                return
                                                                                            }

                                                                                            setDraft(currentDraft =>
                                                                                                moveQuestionWithinTheme(
                                                                                                    currentDraft,
                                                                                                    questionDragState,
                                                                                                    question.id
                                                                                                )
                                                                                            )
                                                                                            setQuestionDragState(null)
                                                                                        }}
                                                                                    >
                                                                                        <button
                                                                                            aria-label={`Select ${questionLabel}`}
                                                                                            className={cn(
                                                                                                'glass-focus flex min-h-[4.5rem] min-w-[4.75rem] flex-col items-center justify-center rounded-2xl border px-3 py-2 text-center text-sm transition',
                                                                                                isSelected
                                                                                                    ? 'border-violet-300/40 bg-violet-500/14 text-white'
                                                                                                    : 'border-white/10 bg-slate-950/18 text-slate-200 hover:bg-white/6'
                                                                                            )}
                                                                                            data-testid={`question-select-${question.id}`}
                                                                                            onClick={() =>
                                                                                                setSelectionAndOpen({
                                                                                                    questionId: question.id,
                                                                                                    roundId: round.id,
                                                                                                    themeId: theme.id
                                                                                                })
                                                                                            }
                                                                                            type="button"
                                                                                        >
                                                                                            <span className="inline-flex items-center gap-1">
                                                                                                <GripVertical className="size-3.5 text-slate-400" />
                                                                                                <span className="font-semibold">
                                                                                                    {round.isFinalRound ? 'Final' : question.price}
                                                                                                </span>
                                                                                            </span>
                                                                                            {questionTypeLabel ? (
                                                                                                <span className="mt-1 text-[0.62em] leading-tight text-slate-300">
                                                                                                    {questionTypeLabel}
                                                                                                </span>
                                                                                            ) : null}
                                                                                        </button>
                                                                                    </div>
                                                                                )
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>
                </aside>

                <main className="min-w-0 flex-1">
                    {selected ? (
                        <div className="space-y-6">
                            <Card>
                                <CardHeader className="pb-4">
                                    <button
                                        className="glass-focus flex w-full items-center justify-between rounded-2xl px-2 py-1 text-left"
                                        onClick={() => setIsPackDetailsOpen(current => !current)}
                                        type="button"
                                    >
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.35em] text-violet-200/55">Pack Details</p>
                                            <h2 className="mt-2 text-xl font-semibold text-white">{draft.name || 'Untitled Pack'}</h2>
                                        </div>
                                        {isPackDetailsOpen ? (
                                            <ChevronDown className="size-5 text-slate-300" />
                                        ) : (
                                            <ChevronRight className="size-5 text-slate-300" />
                                        )}
                                    </button>
                                </CardHeader>
                                {isPackDetailsOpen ? (
                                    <CardContent className="space-y-4">
                                        <div className="grid gap-4 xl:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label>Pack name</Label>
                                                <Input
                                                    aria-label="Pack name"
                                                    onChange={event => setDraft(current => ({ ...current, name: event.target.value }))}
                                                    value={draft.name}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Author</Label>
                                                <Input
                                                    aria-label="Author"
                                                    onChange={event => setDraft(current => ({ ...current, author: event.target.value }))}
                                                    value={draft.author}
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                ) : null}
                            </Card>

                            <Card>
                                <CardHeader className="pb-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.35em] text-violet-200/55">
                                                {selected.round.isFinalRound ? 'Final Question' : `Question ${selected.question.price}`}
                                            </p>
                                            <h2 className="mt-2 text-2xl font-semibold text-white">
                                                {selected.theme.name} / {selected.round.name}
                                            </h2>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className="rounded-full border border-white/10 bg-slate-950/30 px-4 py-2 text-sm text-slate-200">
                                                {QUESTION_TYPE_LABELS[selected.question.type]}
                                            </div>
                                            <Button
                                                aria-label={
                                                    hasQuestionOverrides ? 'Overrides active' : isQuestionOverridesVisible ? 'Hide overrides' : 'Show overrides'
                                                }
                                                disabled={hasQuestionOverrides}
                                                onClick={() =>
                                                    setQuestionOverridesOpenByQuestionId(current => ({
                                                        ...current,
                                                        [selected.question.id]: !isQuestionOverridesVisible
                                                    }))
                                                }
                                                size="sm"
                                                type="button"
                                                variant="ghost"
                                            >
                                                {hasQuestionOverrides ? 'Overrides Active' : isQuestionOverridesVisible ? 'Hide Overrides' : 'Show Overrides'}
                                            </Button>
                                            <Button
                                                aria-label={`Delete ${selected.round.isFinalRound ? 'final question' : `question ${selected.question.price}`} from ${selected.theme.name}`}
                                                onClick={() => handleDeleteQuestion(selected.round.id, selected.theme.id, selected.question.id)}
                                                size="sm"
                                                type="button"
                                                variant="outlineDanger"
                                            >
                                                <Trash2 className="size-4" />
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid gap-4 xl:grid-cols-2">
                                        {!selected.round.isFinalRound ? (
                                            <div className="space-y-2">
                                                <Label>Question price</Label>
                                                <Input
                                                    aria-label="Question price"
                                                    min={0}
                                                    onChange={event =>
                                                        updateDraftQuestion(question => ({
                                                            ...question,
                                                            price: Math.max(0, Number(event.target.value) || 0)
                                                        }))
                                                    }
                                                    type="number"
                                                    value={selected.question.price}
                                                />
                                            </div>
                                        ) : null}
                                        <div className="space-y-2">
                                            <Label>Question type</Label>
                                            <Select
                                                onValueChange={value =>
                                                    updateDraftQuestion(question => ({
                                                        ...question,
                                                        type: value as JeopardyPackDraftQuestion['type']
                                                    }))
                                                }
                                                value={selected.question.type}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {JEOPARDY_PACK_EDITOR_QUESTION_TYPES.map(type => (
                                                        <SelectItem key={type} value={type}>
                                                            {QUESTION_TYPE_LABELS[type]}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {isQuestionOverridesVisible ? (
                                        <div className="grid gap-4 xl:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label>Question theme override</Label>
                                                <Input
                                                    aria-label="Question theme override input"
                                                    onChange={event =>
                                                        updateDraftQuestion(question => ({
                                                            ...question,
                                                            questionTheme: event.target.value
                                                        }))
                                                    }
                                                    placeholder="Optional special theme name"
                                                    value={selected.question.questionTheme}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Answer duration override (seconds)</Label>
                                                <Input
                                                    aria-label="Answer duration override"
                                                    min={0}
                                                    onChange={event =>
                                                        updateDraftQuestion(question => ({
                                                            ...question,
                                                            answerDurationMs: event.target.value ? Math.max(0, Number(event.target.value)) * 1000 : null
                                                        }))
                                                    }
                                                    type="number"
                                                    value={selected.question.answerDurationMs ? Math.round(selected.question.answerDurationMs / 1000) : ''}
                                                />
                                            </div>
                                        </div>
                                    ) : null}

                                    {showSelectionMode ? (
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label>Secret selection mode</Label>
                                                <Select
                                                    onValueChange={value =>
                                                        updateDraftQuestion(question => ({
                                                            ...question,
                                                            selectionMode: value as JeopardyPackDraftQuestion['selectionMode']
                                                        }))
                                                    }
                                                    value={selected.question.selectionMode}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="exceptCurrent">Anyone except the picker</SelectItem>
                                                        <SelectItem value="any">Any contestant</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    ) : null}

                                    {showSpecialValueRange ? (
                                        <div className="grid gap-4 md:grid-cols-3">
                                            <div className="space-y-2">
                                                <Label>Special value min</Label>
                                                <Input
                                                    aria-label="Special value min"
                                                    min={1}
                                                    onChange={event =>
                                                        updateDraftQuestion(question => ({
                                                            ...question,
                                                            priceRange: {
                                                                ...question.priceRange,
                                                                min: Math.max(1, Number(event.target.value) || 1)
                                                            }
                                                        }))
                                                    }
                                                    type="number"
                                                    value={selected.question.priceRange.min}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Special value max</Label>
                                                <Input
                                                    aria-label="Special value max"
                                                    min={selected.question.priceRange.min}
                                                    onChange={event =>
                                                        updateDraftQuestion(question => ({
                                                            ...question,
                                                            priceRange: {
                                                                ...question.priceRange,
                                                                max: Math.max(question.priceRange.min, Number(event.target.value) || question.priceRange.min)
                                                            }
                                                        }))
                                                    }
                                                    type="number"
                                                    value={selected.question.priceRange.max}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Special value step</Label>
                                                <Input
                                                    aria-label="Special value step"
                                                    min={1}
                                                    onChange={event =>
                                                        updateDraftQuestion(question => ({
                                                            ...question,
                                                            priceRange: {
                                                                ...question.priceRange,
                                                                step: Math.max(1, Number(event.target.value) || 1)
                                                            }
                                                        }))
                                                    }
                                                    type="number"
                                                    value={selected.question.priceRange.step}
                                                />
                                            </div>
                                        </div>
                                    ) : null}

                                    <div className="grid gap-4 xl:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label>Accepted answers</Label>
                                            <Textarea
                                                aria-label="Accepted answers"
                                                onChange={event =>
                                                    updateDraftQuestion(question => ({
                                                        ...question,
                                                        acceptedAnswers: splitLines(event.target.value)
                                                    }))
                                                }
                                                placeholder="One accepted answer per line"
                                                value={joinLines(selected.question.acceptedAnswers)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Wrong answers</Label>
                                            <Textarea
                                                aria-label="Wrong answers"
                                                onChange={event =>
                                                    updateDraftQuestion(question => ({
                                                        ...question,
                                                        wrongAnswers: splitLines(event.target.value)
                                                    }))
                                                }
                                                placeholder="Optional wrong answers, one per line"
                                                value={joinLines(selected.question.wrongAnswers)}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="grid gap-6 2xl:grid-cols-2">
                                <AtomListEditor
                                    assets={draft.assets}
                                    atoms={selected.question.preBuzzAtoms}
                                    canDeleteLastAtom={false}
                                    dragState={dragState}
                                    onAddAtom={type => addAtom('preBuzzAtoms', type)}
                                    onChangeAtom={(atomId, patch) => updateAtom('preBuzzAtoms', atomId, patch)}
                                    onDeleteAtom={atomId => deleteAtom('preBuzzAtoms', atomId)}
                                    onDropAtom={targetAtomId => handleDropIntoSection('preBuzzAtoms', targetAtomId)}
                                    onEndDragging={() => setDragState(null)}
                                    onReplaceAsset={(atomId, file) => replaceAtomAsset('preBuzzAtoms', atomId, file)}
                                    onStartDragging={atomId => setDragState({ atomId, section: 'preBuzzAtoms' })}
                                    section="preBuzzAtoms"
                                    title="Atoms Before the Buzz"
                                />
                                <AtomListEditor
                                    assets={draft.assets}
                                    atoms={selected.question.postBuzzAtoms}
                                    canDeleteLastAtom
                                    dragState={dragState}
                                    onAddAtom={type => addAtom('postBuzzAtoms', type)}
                                    onChangeAtom={(atomId, patch) => updateAtom('postBuzzAtoms', atomId, patch)}
                                    onDeleteAtom={atomId => deleteAtom('postBuzzAtoms', atomId)}
                                    onDropAtom={targetAtomId => handleDropIntoSection('postBuzzAtoms', targetAtomId)}
                                    onEndDragging={() => setDragState(null)}
                                    onReplaceAsset={(atomId, file) => replaceAtomAsset('postBuzzAtoms', atomId, file)}
                                    onStartDragging={atomId => setDragState({ atomId, section: 'postBuzzAtoms' })}
                                    section="postBuzzAtoms"
                                    title="Atoms After the Buzz"
                                />
                            </div>
                        </div>
                    ) : (
                        <Card>
                            <CardHeader>
                                <h2 className="text-xl font-semibold text-white">No question selected</h2>
                                <p className="text-sm text-slate-300">Pick a question from the outline or create a new pack to get started.</p>
                            </CardHeader>
                        </Card>
                    )}
                </main>
            </div>
        </div>
    )
}
