import React from 'react'
import { Spinner } from 'client/ui/primitives'
import { cn } from 'client/ui/lib/cn'

type Props = {
    isLoading: boolean
    text?: string
    transitionDuration?: number
    zIndex?: number | 'auto'
    hideProgress?: boolean
}

export const LoadingOverlay: React.FC<Props> = ({ isLoading, text, transitionDuration, zIndex, hideProgress }) => {
    if (!isLoading) {
        return null
    }

    return (
        <div
            className={cn(
                'fixed inset-0 flex items-center justify-center bg-slate-950/72 backdrop-blur-sm transition-opacity',
                transitionDuration === 0 ? 'duration-0' : 'duration-200'
            )}
            style={{ zIndex: zIndex === 'auto' ? undefined : zIndex ?? 40 }}
        >
            <div className="glass-card flex items-center gap-3 px-5 py-4 text-sm text-slate-100">
                {hideProgress ? null : <Spinner />}
                {text ? <span>{text}</span> : null}
            </div>
        </div>
    )
}
