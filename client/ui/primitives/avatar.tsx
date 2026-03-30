'use client'

import * as React from 'react'
import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { UserRound } from 'lucide-react'
import { cn } from '../lib/cn'

export const Avatar = React.forwardRef<React.ElementRef<typeof AvatarPrimitive.Root>, React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>>(
    ({ className, ...props }, ref) => (
        <AvatarPrimitive.Root ref={ref} className={cn('glass-panel relative flex shrink-0 overflow-hidden rounded-full', className)} {...props} />
    )
)

Avatar.displayName = AvatarPrimitive.Root.displayName

export const AvatarImage = React.forwardRef<React.ElementRef<typeof AvatarPrimitive.Image>, React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>>(
    ({ className, ...props }, ref) => <AvatarPrimitive.Image ref={ref} className={cn('aspect-square size-full object-cover', className)} {...props} />
)

AvatarImage.displayName = AvatarPrimitive.Image.displayName

export const AvatarFallback = React.forwardRef<
    React.ElementRef<typeof AvatarPrimitive.Fallback>,
    React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, children, ...props }, ref) => (
    <AvatarPrimitive.Fallback ref={ref} className={cn('flex size-full items-center justify-center bg-violet-500/20 text-slate-100', className)} {...props}>
        {children || <UserRound className="size-6" />}
    </AvatarPrimitive.Fallback>
))

AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName
