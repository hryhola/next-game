'use client'

import * as React from 'react'
import { cn } from '../lib/cn'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
    <input
        ref={ref}
        className={cn('glass-input glass-focus h-12 w-full rounded-2xl px-4 text-sm placeholder:text-slate-400 focus:outline-none', className)}
        {...props}
    />
))

Input.displayName = 'Input'
