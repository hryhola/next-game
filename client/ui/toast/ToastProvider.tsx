'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { cn } from 'client/ui/lib/cn'

const PENDING_TOAST_STORAGE_KEY = 'next-game:pending-toast'

type ToastOptions = {
    content: React.ReactNode
    duration?: number
    className?: string
    persistOnNextMount?: boolean
}

type ToastRecord = ToastOptions & {
    id: string
}

type ToastContextValue = {
    push: (options: ToastOptions) => void
}

const ToastContext = createContext<ToastContextValue>({
    push: () => {}
})

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastRecord[]>(() => {
        if (typeof window === 'undefined') {
            return []
        }

        const rawPendingToast = window.sessionStorage.getItem(PENDING_TOAST_STORAGE_KEY)

        if (!rawPendingToast) {
            return []
        }

        window.sessionStorage.removeItem(PENDING_TOAST_STORAGE_KEY)

        try {
            const pendingToast = JSON.parse(rawPendingToast) as {
                className?: string
                content: string
                createdAt: number
                duration: number
            }
            const remainingDuration = pendingToast.duration - (Date.now() - pendingToast.createdAt)

            if (remainingDuration <= 0) {
                return []
            }

            return [
                {
                    id: crypto.randomUUID(),
                    className: pendingToast.className,
                    content: pendingToast.content,
                    duration: remainingDuration
                }
            ]
        } catch (_error) {
            return []
        }
    })

    const scheduleToastRemoval = (toast: ToastRecord) => {
        window.setTimeout(() => {
            setToasts(curr => curr.filter(item => item.id !== toast.id))
        }, toast.duration)
    }

    useEffect(() => {
        toasts.forEach(scheduleToastRemoval)
    }, [])

    const value = useMemo<ToastContextValue>(
        () => ({
            push: options => {
                const toast = {
                    id: crypto.randomUUID(),
                    duration: options.duration ?? 3000,
                    ...options
                }

                setToasts(curr => [...curr, toast])
                scheduleToastRemoval(toast)

                if (options.persistOnNextMount && typeof options.content === 'string') {
                    window.sessionStorage.setItem(
                        PENDING_TOAST_STORAGE_KEY,
                        JSON.stringify({
                            className: options.className,
                            content: options.content,
                            createdAt: Date.now(),
                            duration: toast.duration
                        })
                    )
                }
            }
        }),
        []
    )

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[90] flex flex-col items-center gap-3 px-4">
                {toasts.map(toast => (
                    <div key={toast.id} className={cn('glass-card pointer-events-auto max-w-xl px-4 py-3 text-sm text-slate-100', toast.className)}>
                        {toast.content}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}

export const useToast = () => {
    return useContext(ToastContext)
}
