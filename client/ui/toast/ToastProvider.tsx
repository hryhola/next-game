'use client'

import React, { createContext, useContext, useMemo, useState } from 'react'
import { cn } from 'client/ui/lib/cn'

type ToastOptions = {
    content: React.ReactNode
    duration?: number
    className?: string
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
    const [toasts, setToasts] = useState<ToastRecord[]>([])

    const value = useMemo<ToastContextValue>(
        () => ({
            push: options => {
                const toast = {
                    id: crypto.randomUUID(),
                    duration: 3000,
                    ...options
                }

                setToasts(curr => [...curr, toast])

                window.setTimeout(() => {
                    setToasts(curr => curr.filter(item => item.id !== toast.id))
                }, toast.duration)
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
