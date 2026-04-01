import { FormEventHandler, useContext, useState, useRef, useEffect } from 'react'
import { useI18n, useLobby } from 'client/context/list'
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
    const { t, tFieldLabel, tGameName, translateErrorMessage } = useI18n()

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
            return setError(translateErrorMessage(String(postError)))
        }

        if (!response.success) {
            setError(translateErrorMessage(response.message))

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
            setError(translateErrorMessage(String(postError)))
            return
        }

        if (!response.success) {
            setError(translateErrorMessage(response.message))
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
                setError(translateErrorMessage(String(postError)))
                return
            }

            if (!response.success) {
                setError(translateErrorMessage(response.message))
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
                {error ? (
                    <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{translateErrorMessage(error)}</div>
                ) : null}
                <Input required placeholder={t('lobbyCreator.lobbyName')} name="lobbyId" value={lobbyId} onChange={e => setLobbyId(e.target.value)} />
                <div>
                    <VisuallyHidden asChild>
                        <Label htmlFor="game-type-selector">{t('common.game')}</Label>
                    </VisuallyHidden>
                    <Select value={gameName} onValueChange={value => handleGameNameChange(value as GameName)}>
                        <SelectTrigger id="game-type-selector">
                            <SelectValue placeholder={t('lobbyCreator.selectGame')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="TicTacToe">{tGameName('TicTacToe')}</SelectItem>
                            <SelectItem value="Clicker">{tGameName('Clicker')}</SelectItem>
                            <SelectItem value="Jeopardy">{tGameName('Jeopardy')}</SelectItem>
                        </SelectContent>
                    </Select>
                    <input type="hidden" name="gameName" value={gameName} />
                </div>

                {initialDataScheme.map(field => (
                    <div key={field.name} className="space-y-2">
                        {field.type === 'field' && (
                            <Input placeholder={tFieldLabel(field.name, field.label)} name={'initialData-' + field.name} required={field.required} />
                        )}
                        {field.type === 'file' && (
                            <div className="space-y-2">
                                <Label>{tFieldLabel(field.name, field.label)}</Label>
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
                                                {isValidatingPack ? t('lobbyCreator.validating') : t('lobbyCreator.validate')}
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
                                                        <div className="text-[0.6875em] font-semibold leading-[1.45em] text-white">
                                                            {packValidation.compatible ? t('lobbyCreator.compatible') : t('lobbyCreator.notCompatible')}
                                                        </div>
                                                        <p
                                                            className={cn(
                                                                'mt-1 text-[0.6875em] leading-[1.45em]',
                                                                packValidation.compatible ? 'text-emerald-100/90' : 'text-slate-300'
                                                            )}
                                                        >
                                                            {packValidation.compatible
                                                                ? t('lobbyCreator.compatibleDescription')
                                                                : t('lobbyCreator.notCompatibleDescription')}
                                                        </p>
                                                    </div>
                                                </div>
                                                {!packValidation.compatible && packValidation.reason ? (
                                                    <div className="mt-2">
                                                        <button
                                                            type="button"
                                                            className="glass-focus flex w-full items-center justify-between rounded-xl px-2 py-1 text-[0.5625em]! font-medium text-slate-300 transition hover:bg-white/6 hover:text-white"
                                                            onClick={() => setIsPackValidationDetailsOpen(current => !current)}
                                                        >
                                                            <span>
                                                                {isPackValidationDetailsOpen
                                                                    ? t('lobbyCreator.hideTechnicalReason')
                                                                    : t('lobbyCreator.showTechnicalReason')}
                                                            </span>
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
                                                                    'text-[0.625em] leading-[1.6em] whitespace-pre-wrap break-words text-slate-400'
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

                <Input placeholder={t('common.password')} name="password" value={password} onChange={e => setPassword(e.target.value.split('\\').pop()!)} />
                <div className="mt-auto pb-2">
                    <Button className="w-full" type="submit" size="lg" disabled={isLoading || isValidatingPack}>
                        {t('common.create')}
                    </Button>
                </div>
            </form>
            <LoadingOverlay isLoading={isLoading} />
        </>
    )
}
