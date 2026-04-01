import { FormEventHandler, useContext, useState, useRef, useEffect } from 'react'
import { useLobby } from 'client/context/list'
import { useClientRouter } from 'client/route/ClientRouter'
import { LoadingOverlay } from 'client/ui'
import { api } from 'client/network-utils/api'
import { HomeContext } from 'client/context/list/homeCtx'
import type { GameName, InitialGameDataSchema } from 'shared/contracts/app'
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, VisuallyHidden } from 'client/ui/primitives'
import { cn } from 'client/ui/lib/cn'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'

type JeopardyPackValidationState = {
    compatible: boolean
    reason?: string
}

export const LobbyCreator: React.FC = () => {
    const home = useContext(HomeContext)
    const router = useClientRouter()
    const lobby = useLobby()

    const formRef = useRef<HTMLFormElement | null>(null)

    const [lobbyId, setLobbyId] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [gameName, setGameName] = useState<GameName>('Clicker')
    const [isLoading, setIsLoading] = useState(false)
    const [isValidatingPack, setIsValidatingPack] = useState(false)
    const [initialDataScheme, setInitialDataScheme] = useState<InitialGameDataSchema>([])
    const [selectedJeopardyPack, setSelectedJeopardyPack] = useState<File | null>(null)
    const [packValidation, setPackValidation] = useState<JeopardyPackValidationState | null>(null)
    const [isPackValidationDetailsOpen, setIsPackValidationDetailsOpen] = useState(false)

    const resetPackValidation = () => {
        setPackValidation(null)
        setIsPackValidationDetailsOpen(false)
    }

    const handleGameNameChange = (value: GameName) => {
        setGameName(value)
        setSelectedJeopardyPack(null)
        resetPackValidation()
    }

    const handleSubmit: FormEventHandler<HTMLFormElement> = async event => {
        event.preventDefault()

        const data = new FormData(formRef.current!)

        setIsLoading(true)

        const [response, postError] = await api.post('lobby-create', data).finally(() => setIsLoading(false))

        if (!response) {
            return setError(String(postError))
        }

        if (!response.success) {
            setError(response.message)

            return
        }

        lobby.setLobbyId(lobbyId)
        lobby.setGameName(gameName)

        home.setIsCreateLobbyOpen(false)

        router.setFrame('Lobby')
    }

    const handleValidateJeopardyPack = async () => {
        if (!selectedJeopardyPack) {
            return
        }

        const data = new FormData()
        data.set('pack', selectedJeopardyPack)

        setError('')
        resetPackValidation()
        setIsValidatingPack(true)

        const [response, postError] = await api.post('jeopardy-validate-pack', data).finally(() => setIsValidatingPack(false))

        if (!response) {
            setError(String(postError))
            return
        }

        if (!response.success) {
            setError(response.message)
            return
        }

        setPackValidation({
            compatible: response.compatible,
            reason: response.reason
        })
    }

    useEffect(() => {
        let isCancelled = false

        const loadGameSchema = async () => {
            const [response, postError] = await api.post('game-get-schema', { gameName })

            if (isCancelled) {
                return
            }

            if (!response) {
                setError(String(postError))
                return
            }

            if (!response.success) {
                setError(response.message)
                return
            }

            setError('')
            setInitialDataScheme(response.initialDataScheme || [])
        }

        void loadGameSchema()

        return () => {
            isCancelled = true
        }
    }, [gameName])

    return (
        <>
            <form className="flex h-full flex-col gap-4" onSubmit={handleSubmit} ref={formRef}>
                {error ? <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
                <Input required placeholder="Lobby name" name="lobbyId" value={lobbyId} onChange={e => setLobbyId(e.target.value)} />
                <div>
                    <VisuallyHidden asChild>
                        <Label htmlFor="game-type-selector">Game</Label>
                    </VisuallyHidden>
                    <Select value={gameName} onValueChange={value => handleGameNameChange(value as GameName)}>
                        <SelectTrigger id="game-type-selector">
                            <SelectValue placeholder="Select a game" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="TicTacToe">Tic Tac Toe</SelectItem>
                            <SelectItem value="Clicker">Clicker</SelectItem>
                            <SelectItem value="Jeopardy">Jeopardy</SelectItem>
                        </SelectContent>
                    </Select>
                    <input type="hidden" name="gameName" value={gameName} />
                </div>

                {initialDataScheme.map(field => (
                    <div key={field.name} className="space-y-2">
                        {field.type === 'field' && <Input placeholder={field.label} name={'initialData-' + field.name} required={field.required} />}
                        {field.type === 'file' && (
                            <div className="space-y-2">
                                <Label>{field.label}</Label>
                                <input
                                    className="glass-input block w-full rounded-2xl px-4 py-3 text-sm"
                                    required={field.required}
                                    multiple={false}
                                    accept={field.accept.join(',')}
                                    name={'initialData-' + field.name}
                                    onChange={event => {
                                        if (gameName !== 'Jeopardy' || field.name !== 'pack') {
                                            return
                                        }

                                        setSelectedJeopardyPack(event.target.files?.[0] || null)
                                        resetPackValidation()
                                    }}
                                    type="file"
                                />
                                {gameName === 'Jeopardy' && field.name === 'pack' && selectedJeopardyPack ? (
                                    <div className="space-y-2">
                                        <div className="flex justify-end">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={isLoading || isValidatingPack}
                                                onClick={handleValidateJeopardyPack}
                                            >
                                                {isValidatingPack ? 'Validating...' : 'Validate'}
                                            </Button>
                                        </div>
                                        {packValidation ? (
                                            <div
                                                className={cn(
                                                    'glass-card rounded-[1.25rem] border p-3 shadow-[0_18px_48px_rgba(15,23,42,0.25)]',
                                                    packValidation.compatible ? 'border-emerald-400/20 bg-emerald-500/10' : 'border-rose-400/20 bg-slate-950/78'
                                                )}
                                            >
                                                <div className="flex items-start gap-2.5">
                                                    <div
                                                        className={cn(
                                                            'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border',
                                                            packValidation.compatible
                                                                ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200'
                                                                : 'border-rose-400/25 bg-rose-500/10 text-rose-200'
                                                        )}
                                                    >
                                                        {packValidation.compatible ? (
                                                            <CheckCircle2 className="size-3.5" />
                                                        ) : (
                                                            <AlertTriangle className="size-3.5" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-[11px] font-semibold leading-4 text-white">
                                                            {packValidation.compatible ? 'Compatible' : 'Not compatible'}
                                                        </div>
                                                        <p
                                                            className={cn(
                                                                'mt-1 text-[11px] leading-4',
                                                                packValidation.compatible ? 'text-emerald-100/90' : 'text-slate-300'
                                                            )}
                                                        >
                                                            {packValidation.compatible
                                                                ? 'This SIQ pack is supported by the current Jeopardy implementation.'
                                                                : 'This SIQ pack uses features that the current Jeopardy implementation cannot run yet.'}
                                                        </p>
                                                    </div>
                                                </div>
                                                {!packValidation.compatible && packValidation.reason ? (
                                                    <div className="mt-2">
                                                        <button
                                                            type="button"
                                                            className="glass-focus flex w-full items-center justify-between rounded-xl px-2 py-1 text-[9px]! font-medium text-slate-300 transition hover:bg-white/6 hover:text-white"
                                                            onClick={() => setIsPackValidationDetailsOpen(current => !current)}
                                                        >
                                                            <span>{isPackValidationDetailsOpen ? 'Hide technical reason' : 'Show technical reason'}</span>
                                                            {isPackValidationDetailsOpen ? (
                                                                <ChevronUp className="size-3.5" />
                                                            ) : (
                                                                <ChevronDown className="size-3.5" />
                                                            )}
                                                        </button>
                                                        {isPackValidationDetailsOpen ? (
                                                            <pre
                                                                className={cn(
                                                                    'mt-2 max-h-40 overflow-auto rounded-xl border border-white/10 bg-slate-950/65 p-2',
                                                                    'text-[10px] leading-4 whitespace-pre-wrap break-words text-slate-400'
                                                                )}
                                                            >
                                                                {packValidation.reason}
                                                            </pre>
                                                        ) : null}
                                                    </div>
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </div>
                ))}

                <Input placeholder="Password" name="password" value={password} onChange={e => setPassword(e.target.value.split('\\').pop()!)} />
                <div className="mt-auto pb-2">
                    <Button className="w-full" type="submit" size="lg" disabled={isLoading || isValidatingPack}>
                        Create
                    </Button>
                </div>
            </form>
            <LoadingOverlay isLoading={isLoading} />
        </>
    )
}
