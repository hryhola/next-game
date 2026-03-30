import React from 'react'
import { X } from 'lucide-react'
import { Button, Dialog, DialogContent } from 'client/ui/primitives'
import { cn } from 'client/ui/lib/cn'

export const FullScreenModal: React.FC<{
    isOpen: boolean
    setIsOpen: (value: boolean) => void
    children: React.ReactNode
    label: string
    transition?: 'left' | 'right' | 'up' | 'down'
    padding?: boolean
}> = props => {
    return (
        <Dialog open={props.isOpen} onOpenChange={props.setIsOpen}>
            <DialogContent
                hideClose
                title={props.label}
                titleVisuallyHidden
                className={cn(
                    'glass-panel fixed inset-0 z-50 flex h-[var(--fullHeight)] w-screen max-w-none translate-x-0 translate-y-0 flex-col rounded-none border-0 p-0',
                    props.transition === 'left' && 'origin-right',
                    props.transition === 'right' && 'origin-left',
                    props.transition === 'up' && 'origin-bottom',
                    props.transition === 'down' && 'origin-top'
                )}
            >
                <div className={cn('flex items-center justify-between border-b border-white/10 px-6', props.padding ? 'py-6' : 'pt-6 pb-4')}>
                    <h2 className="text-xl font-semibold text-white">{props.label}</h2>
                    <Button variant="ghost" size="icon" onClick={() => props.setIsOpen(false)}>
                        <X className="size-4" />
                    </Button>
                </div>
                <div className={cn('min-h-0 flex-1 overflow-y-auto', props.padding ? 'px-6 pb-6' : '')}>{props.children}</div>
            </DialogContent>
        </Dialog>
    )
}
