'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '../lib/cn'

export const Tabs = TabsPrimitive.Root

export const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(
    ({ className, ...props }, ref) => (
        <TabsPrimitive.List ref={ref} className={cn('glass-panel inline-flex h-12 items-center gap-2 rounded-full p-1', className)} {...props} />
    )
)

TabsList.displayName = TabsPrimitive.List.displayName

export const TabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(
    ({ className, ...props }, ref) => (
        <TabsPrimitive.Trigger
            ref={ref}
            className={cn(
                'glass-focus inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium text-slate-300 transition data-[state=active]:bg-violet-400/18 data-[state=active]:text-white data-[state=active]:shadow-[inset_0_0_0_1px_rgba(196,181,253,0.22)]',
                className
            )}
            {...props}
        />
    )
)

TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

export const TabsContent = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>>(
    ({ className, ...props }, ref) => <TabsPrimitive.Content ref={ref} className={cn('mt-4 outline-none', className)} {...props} />
)

TabsContent.displayName = TabsPrimitive.Content.displayName
