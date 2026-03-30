'use client'

import React from 'react'
import { useClientRequestErrorHandler, type ClientRequestErrorEvent } from 'client/context/list/wsCtx'
import { cn } from 'client/ui/lib/cn'
import { AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-react'

function safeStringify(value: unknown): string {
    if (typeof value === 'string') {
        return value
    }

    try {
        return JSON.stringify(value, null, 2)
    } catch (_error) {
        return String(value)
    }
}

function toDetailsText(error: ClientRequestErrorEvent): string {
    const blocks = [
        `Context:\n${error.context}`,
        error.code ? `Code:\n${error.code}` : null,
        `Message:\n${error.message}`,
        error.requestData !== undefined ? `Request payload:\n${safeStringify(error.requestData)}` : null,
        error.details !== undefined ? `Details:\n${safeStringify(error.details)}` : null,
        error.stack ? `Stack:\n${error.stack}` : null
    ].filter(Boolean)

    return blocks.join('\n\n')
}

export const RequestErrorDialog: React.FC = () => {
    const [errors, setErrors] = React.useState<(ClientRequestErrorEvent & { id: string; showDetails: boolean })[]>([])

    useClientRequestErrorHandler(error => {
        setErrors(current =>
            [
                ...current,
                {
                    ...error,
                    id: crypto.randomUUID(),
                    showDetails: false
                }
            ].slice(-4)
        )
    })

    const closeError = React.useCallback((id: string) => {
        setErrors(current => current.filter(error => error.id !== id))
    }, [])

    const toggleDetails = React.useCallback((id: string) => {
        setErrors(current => current.map(error => (error.id === id ? { ...error, showDetails: !error.showDetails } : error)))
    }, [])

    if (!errors.length) {
        return null
    }

    return (
        <div className="pointer-events-none fixed right-4 top-4 z-[95] flex w-[min(24rem,calc(100vw-1rem))] max-w-sm flex-col gap-2">
            {errors.map(error => {
                const detailsText = toDetailsText(error)

                return (
                    <div
                        key={error.id}
                        className="glass-card pointer-events-auto rounded-[1.25rem] border border-rose-400/20 bg-slate-950/78 p-3 shadow-[0_18px_48px_rgba(15,23,42,0.38)]"
                    >
                        <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-rose-400/25 bg-rose-500/10 text-rose-200">
                                <AlertTriangle className="size-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-[11px] font-semibold leading-4 text-white">{error.title}</div>
                                <p className="mt-1 text-[11px] leading-4 text-slate-300">{error.friendlyMessage}</p>
                            </div>
                            <button
                                type="button"
                                className="glass-focus rounded-full p-1 text-slate-400 transition hover:bg-white/8 hover:text-white"
                                onClick={() => closeError(error.id)}
                                aria-label="Close error notification"
                            >
                                <X className="size-3.5" />
                            </button>
                        </div>
                        {detailsText ? (
                            <div className="mt-2">
                                <button
                                    type="button"
                                    className="glass-focus flex w-full items-center justify-between rounded-xl px-2 py-1 text-[9px]! font-medium text-slate-300 transition hover:bg-white/6 hover:text-white"
                                    onClick={() => toggleDetails(error.id)}
                                >
                                    <span>{error.showDetails ? 'Hide details' : 'Show details'}</span>
                                    {error.showDetails ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                                </button>
                                {error.showDetails ? (
                                    <pre
                                        className={cn(
                                            'mt-2 max-h-40 overflow-auto rounded-xl border border-white/10 bg-slate-950/65 p-2',
                                            'text-[10px] leading-4 whitespace-pre-wrap break-words text-slate-400'
                                        )}
                                    >
                                        {detailsText}
                                    </pre>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                )
            })}
        </div>
    )
}
