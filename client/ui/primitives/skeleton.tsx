import * as React from 'react'
import { cn } from '../lib/cn'

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
    return <div className={cn('animate-pulse rounded-3xl bg-white/10', className)} {...props} />
}
