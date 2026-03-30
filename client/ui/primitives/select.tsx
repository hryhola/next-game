'use client'

import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '../lib/cn'

export const Select = SelectPrimitive.Root
export const SelectValue = SelectPrimitive.Value

export const SelectTrigger = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>>(
    ({ className, children, ...props }, ref) => (
        <SelectPrimitive.Trigger
            ref={ref}
            className={cn(
                'glass-input glass-focus flex h-12 w-full items-center justify-between rounded-2xl px-4 text-sm text-slate-100 focus:outline-none',
                className
            )}
            {...props}
        >
            {children}
            <SelectPrimitive.Icon asChild>
                <ChevronDown className="size-4 text-slate-300" />
            </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
    )
)

SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

export const SelectContent = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Content>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>>(
    ({ className, children, ...props }, ref) => (
        <SelectPrimitive.Portal>
            <SelectPrimitive.Content ref={ref} className={cn('glass-card z-50 min-w-[12rem] overflow-hidden p-2', className)} {...props}>
                <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
    )
)

SelectContent.displayName = SelectPrimitive.Content.displayName

export const SelectItem = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Item>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>>(
    ({ className, children, ...props }, ref) => (
        <SelectPrimitive.Item
            ref={ref}
            className={cn('relative flex cursor-default items-center rounded-2xl px-3 py-2 text-sm text-slate-200 outline-none hover:bg-white/8', className)}
            {...props}
        >
            <span className="absolute left-3 flex size-4 items-center justify-center">
                <SelectPrimitive.ItemIndicator>
                    <Check className="size-4" />
                </SelectPrimitive.ItemIndicator>
            </span>
            <SelectPrimitive.ItemText className="pl-6">{children}</SelectPrimitive.ItemText>
        </SelectPrimitive.Item>
    )
)

SelectItem.displayName = SelectPrimitive.Item.displayName
