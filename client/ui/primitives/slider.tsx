'use client'

import * as React from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { cn } from '../lib/cn'

export const Slider = React.forwardRef<React.ElementRef<typeof SliderPrimitive.Root>, React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>>(
    ({ className, ...props }, ref) => (
        <SliderPrimitive.Root ref={ref} className={cn('relative flex w-full touch-none select-none items-center', className)} {...props}>
            <SliderPrimitive.Track className="relative h-2 grow rounded-full bg-white/10">
                <SliderPrimitive.Range className="absolute h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400" />
            </SliderPrimitive.Track>
            <SliderPrimitive.Thumb className="glass-focus block size-5 rounded-full border border-white/30 bg-slate-100 shadow-lg outline-none" />
        </SliderPrimitive.Root>
    )
)

Slider.displayName = SliderPrimitive.Root.displayName
