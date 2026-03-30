import { ProfilePreview } from './ProfilePreview'
import { useHome } from 'client/context/list'
import { Button } from 'client/ui/primitives'
import { Menu } from 'lucide-react'
import { cn } from 'client/ui/lib/cn'

export const headerHeight = '84px'

export const Header: React.FC<React.HTMLAttributes<HTMLElement>> = props => {
    const home = useHome()

    return (
        <header
            className={cn('glass-panel sticky top-0 z-30 flex h-[84px] items-center gap-4 border-b border-white/10 px-4 sm:px-6', props.className)}
            {...props}
        >
            <Button variant="secondary" size="icon" onClick={() => home.setIsNavigationOpen(true)} aria-label="Open navigation">
                <Menu className="size-5" />
            </Button>
            <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-[0.35em] text-violet-200/55">Game Club</p>
                <h1 className="truncate text-xl font-semibold text-white">Play together, instantly.</h1>
            </div>
            <ProfilePreview onClick={() => home.setIsProfileEditOpen(true)} />
        </header>
    )
}
