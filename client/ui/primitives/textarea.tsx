'use client'

import * as React from 'react'
import { cn } from '../lib/cn'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
    <textarea
        ref={ref}
        className={cn('glass-input glass-focus min-h-28 w-full rounded-3xl px-4 py-3 text-sm placeholder:text-slate-400 focus:outline-none', className)}
        {...props}
    />
))

Textarea.displayName = 'Textarea'
