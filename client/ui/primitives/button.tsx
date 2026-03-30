'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/cn'

export const buttonVariants = cva(
    'glass-focus inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50',
    {
        variants: {
            variant: {
                primary:
                    'bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 px-5 text-slate-950 shadow-[0_18px_40px_rgba(139,92,246,0.35)] hover:scale-[1.01] hover:shadow-[0_20px_46px_rgba(139,92,246,0.42)]',
                secondary: 'glass-panel px-5 text-slate-100 hover:border-violet-200/30 hover:bg-white/8',
                ghost: 'px-4 text-slate-200 hover:bg-white/8',
                outline: 'border border-white/15 bg-slate-950/25 px-5 text-slate-100 hover:border-violet-300/35 hover:bg-violet-500/10',
                danger: 'bg-rose-500/90 px-5 text-white shadow-[0_12px_28px_rgba(244,63,94,0.28)] hover:bg-rose-400'
            },
            size: {
                sm: 'h-9 px-4 text-sm',
                md: 'h-11 px-5 text-sm',
                lg: 'h-12 px-6 text-base',
                icon: 'size-10 rounded-full'
            }
        },
        defaultVariants: {
            variant: 'primary',
            size: 'md'
        }
    }
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'

    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
})

Button.displayName = 'Button'
