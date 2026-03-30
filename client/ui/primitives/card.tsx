import * as React from 'react'
import { cn } from '../lib/cn'

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
    return <div className={cn('glass-card', className)} {...props} />
}

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
    return <div className={cn('flex flex-col gap-2 p-6', className)} {...props} />
}

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
    return <div className={cn('px-6 pb-6', className)} {...props} />
}

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
    return <div className={cn('flex items-center gap-3 px-6 pb-6', className)} {...props} />
}
