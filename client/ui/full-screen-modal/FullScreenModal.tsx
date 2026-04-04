import React from 'react'
import { X } from 'lucide-react'
import { Button, Dialog, DialogContent } from 'client/ui/primitives'
import { cn } from 'client/ui/lib/cn'
import { useI18n } from 'client/context/list'

export const FullScreenModal: React.FC<{
    isOpen: boolean
    setIsOpen: (value: boolean) => void
    children: React.ReactNode
    label: string
    transition?: 'left' | 'right' | 'up' | 'down'
    padding?: boolean
    disableClose?: boolean
}> = props => {
    const { t } = useI18n()
    const handleOpenChange = (value: boolean) => {
        if (!value && props.disableClose) {
            return
        }

        props.setIsOpen(value)
    }

    return (
        <Dialog open={props.isOpen} onOpenChange={handleOpenChange}>
            <DialogContent
                hideClose
                title={props.label}
                titleVisuallyHidden
                className={cn(
                    'glass-panel fixed inset-0 z-50 flex h-[var(--fullHeight)] w-screen max-w-none translate-x-0 translate-y-0 flex-col !rounded-none border-0 p-0 lg:inset-auto lg:left-1/2 lg:top-1/2 lg:h-[min(calc(var(--fullHeight)-3rem),48rem)] lg:w-[min(92vw,56rem)] lg:max-w-[56rem] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:!rounded-[2rem] lg:border lg:p-0',
                    props.transition === 'left' && 'origin-right',
                    props.transition === 'right' && 'origin-left',
                    props.transition === 'up' && 'origin-bottom',
                    props.transition === 'down' && 'origin-top'
                )}
            >
                <div className={cn('flex items-center justify-between px-6', props.padding ? 'py-6' : 'pt-6 pb-4')}>
                    <h2 className="text-xl font-semibold text-white">{props.label}</h2>
                    <Button
                        variant="ghost"
                        className={cn('size-12 rounded-full p-0', props.disableClose && 'pointer-events-none opacity-40')}
                        disabled={props.disableClose}
                        onClick={() => props.setIsOpen(false)}
                        aria-label={t('common.close')}
                    >
                        <X className="size-6 text-slate-200" strokeWidth={2.5} />
                    </Button>
                </div>
                <div className={cn('min-h-0 flex-1 overflow-y-auto pt-2', props.padding ? 'px-6 pb-6' : '')}>{props.children}</div>
            </DialogContent>
        </Dialog>
    )
}
