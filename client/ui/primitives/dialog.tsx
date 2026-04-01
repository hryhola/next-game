'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '../lib/cn'
import { VisuallyHidden } from './visually-hidden'
import { useI18n } from 'client/context/list'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogPortal = DialogPrimitive.Portal
export const DialogClose = DialogPrimitive.Close

export const DialogOverlay = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Overlay>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>>(
    ({ className, ...props }, ref) => (
        <DialogPrimitive.Overlay ref={ref} className={cn('fixed inset-0 z-40 bg-slate-950/72 backdrop-blur-sm', className)} {...props} />
    )
)

DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const getElementDisplayName = (type: React.ElementType | unknown) => {
    if (typeof type === 'string') {
        return type
    }

    if (typeof type === 'function') {
        return (type as { displayName?: string; name?: string }).displayName || (type as { displayName?: string; name?: string }).name
    }

    if (typeof type === 'object' && type && 'displayName' in type) {
        return (type as { displayName?: string }).displayName
    }

    return undefined
}

const hasExplicitDialogTitle = (children: React.ReactNode): boolean => {
    return React.Children.toArray(children).some(child => {
        if (!React.isValidElement(child)) {
            return false
        }

        const displayName = getElementDisplayName(child.type)

        if (
            child.type === DialogTitle ||
            child.type === DialogPrimitive.Title ||
            displayName === DialogTitle.displayName ||
            displayName === 'AlertDialogTitle'
        ) {
            return true
        }

        return hasExplicitDialogTitle((child.props as { children?: React.ReactNode }).children)
    })
}

export const DialogContent = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Content>,
    Omit<React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, 'title'> & {
        hideClose?: boolean
        title?: React.ReactNode
        titleVisuallyHidden?: boolean
    }
>(({ className, children, hideClose, title, titleVisuallyHidden, ...props }, ref) => {
    const { t } = useI18n()
    const hasAccessibleTitle =
        title !== undefined && title !== null && (typeof title !== 'string' || title.trim().length > 0) ? true : hasExplicitDialogTitle(children)

    if (process.env.NODE_ENV !== 'production' && !hasAccessibleTitle) {
        throw new Error('DialogContent requires either a `title` prop or an explicit DialogTitle child for screen reader accessibility.')
    }

    const resolvedTitle =
        title !== undefined && title !== null ? (
            titleVisuallyHidden ? (
                <VisuallyHidden asChild>
                    <DialogTitle>{title}</DialogTitle>
                </VisuallyHidden>
            ) : (
                <DialogTitle className="mb-2 pr-10">{title}</DialogTitle>
            )
        ) : null

    return (
        <DialogPortal>
            <DialogOverlay />
            <DialogPrimitive.Content
                ref={ref}
                className={cn('glass-card fixed left-1/2 top-1/2 z-50 w-[min(92vw,42rem)] -translate-x-1/2 -translate-y-1/2 p-6 outline-none', className)}
                {...props}
            >
                {!hideClose ? (
                    <DialogPrimitive.Close className="glass-focus absolute right-4 top-4 rounded-full p-2 text-slate-300 transition hover:bg-white/8 hover:text-white">
                        <X className="size-4" />
                        <span className="sr-only">{t('common.close')}</span>
                    </DialogPrimitive.Close>
                ) : null}
                {resolvedTitle}
                {children}
            </DialogPrimitive.Content>
        </DialogPortal>
    )
})

DialogContent.displayName = DialogPrimitive.Content.displayName

export const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
    <div className={cn('flex flex-col gap-2', className)} {...props} />
)

export const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
    <div className={cn('mt-6 flex flex-wrap justify-end gap-3', className)} {...props} />
)

export const DialogTitle = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Title>, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(
    ({ className, ...props }, ref) => <DialogPrimitive.Title ref={ref} className={cn('text-2xl font-semibold text-white', className)} {...props} />
)

DialogTitle.displayName = DialogPrimitive.Title.displayName

export const DialogDescription = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Description>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => <DialogPrimitive.Description ref={ref} className={cn('text-sm text-slate-300', className)} {...props} />)

DialogDescription.displayName = DialogPrimitive.Description.displayName
