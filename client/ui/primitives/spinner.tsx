import { LoaderCircle } from 'lucide-react'
import { cn } from '../lib/cn'

export const Spinner: React.FC<{ className?: string }> = ({ className }) => {
    return <LoaderCircle className={cn('size-5 animate-spin text-violet-200', className)} />
}
