import { ProfilePreview } from './ProfilePreview'
import { useHome } from 'client/context/list'
import { cn } from 'client/ui/lib/cn'

export const Header: React.FC<React.HTMLAttributes<HTMLElement>> = ({ className, ...props }) => {
    const home = useHome()

    return (
        <header
            className={cn(
                'glass-panel sticky top-0 z-30 grid h-[84px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-white/10 px-5 sm:px-6',
                className
            )}
            {...props}
        >
            <p className="min-w-0 truncate text-xs uppercase tracking-[0.35em] text-violet-200/55">Game Club</p>
            <ProfilePreview className="shrink-0" onClick={() => home.setIsProfileEditOpen(true)} />
        </header>
    )
}
