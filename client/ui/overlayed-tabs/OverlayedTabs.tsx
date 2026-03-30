import * as React from 'react'
import { useEffect, useState } from 'react'
import { Button } from 'client/ui/primitives'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { cn } from 'client/ui/lib/cn'

export const overlayedTabsToolbarHeight = '48px'

type View = (opts: { fullscreen: boolean; isOpen: boolean; direction?: 'up' | 'down' }) => React.ReactNode

type PopoverProps = {
    header: React.ReactNode
    view: View
    fullscreen: boolean
    direction: 'up' | 'down'
    height: string
    hideIconOnOpen?: boolean
}

const PopoverView: React.FC<PopoverProps> = props => {
    const [isOpen, setIsOpen] = useState(false)

    const hiddenIcon = isOpen && props.hideIconOnOpen

    return (
        <div
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
            className="relative flex h-12 w-[46px] items-center justify-center rounded-t-[30px] bg-slate-900/90 transition-all"
            style={{ bottom: isOpen && props.direction === 'up' ? props.height : '0' }}
        >
            {hiddenIcon ? null : props.header}
            <div
                className={cn(
                    'absolute overflow-hidden transition-opacity',
                    hiddenIcon ? 'top-0 rounded-t-[30px]' : 'top-[45px]',
                    isOpen ? 'visible opacity-100' : 'invisible opacity-0'
                )}
            >
                {props.view({
                    fullscreen: props.fullscreen,
                    isOpen,
                    direction: props.direction
                })}
            </div>
        </div>
    )
}

type Props = {
    views: {
        type?: 'default' | 'popover'
        view: View
        hideIconOnOpen?: boolean
        header: React.ReactNode
        onFullscreen?: (value: boolean) => void
        height?: string
    }[]
    buttons?: React.ReactNode[]
    onViewOpen?: () => void
    onViewClose?: () => void
    label: string
}

const OverlayedTabs: React.FC<Props> = props => {
    const [value, setValue] = useState<number | null>(null)
    const [fullscreen, setFullscreen] = useState(false)

    const handleFullscreen = () => {
        if (value !== null) {
            const cb = props.views[value]?.onFullscreen

            cb && cb(!fullscreen)
        }

        setFullscreen(!fullscreen)
    }

    useEffect(() => {
        if (value === null) {
            props.onViewClose && props.onViewClose()
        } else {
            props.onViewOpen && props.onViewOpen()
        }
    }, [value])

    const barMargin = value === null ? '0' : fullscreen ? `calc(var(--fullHeight) - ${overlayedTabsToolbarHeight})` : '50vh'

    const defaultViews = props.views.filter(({ type }) => type !== 'popover')
    const popoverViews = props.views.filter(({ type }) => type === 'popover')

    return (
        <div>
            <div className="glass-panel fixed left-0 right-0 z-30 flex items-center gap-2 px-2 py-1" style={{ bottom: barMargin }}>
                {value !== null ? (
                    <Button variant="ghost" size="icon" onClick={handleFullscreen}>
                        {fullscreen ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
                    </Button>
                ) : null}
                <div className="flex items-center gap-2">
                    {defaultViews.map(({ header }, key) => (
                        <Button key={key} variant={value === key ? 'primary' : 'secondary'} size="sm" onClick={() => setValue(key)}>
                            {header}
                        </Button>
                    ))}
                </div>
                {props.buttons ? props.buttons.map((button, index) => <React.Fragment key={index}>{button}</React.Fragment>) : null}
                <div className="ml-auto flex items-center gap-2">
                    {popoverViews.map((p, key) => (
                        <PopoverView
                            key={key}
                            {...p}
                            fullscreen={fullscreen}
                            direction={value === null ? 'up' : 'down'}
                            height={p.height!}
                            hideIconOnOpen={p.hideIconOnOpen}
                        />
                    ))}
                    {value !== null ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                setValue(null)
                                setFullscreen(false)
                            }}
                        >
                            <X className="size-4" />
                        </Button>
                    ) : null}
                </div>
            </div>
            {value !== null ? (
                <div className="glass-panel fixed bottom-0 left-0 right-0 z-20 overflow-hidden" style={{ height: barMargin }}>
                    {props.views[value]?.view({
                        fullscreen,
                        isOpen: true
                    })}
                </div>
            ) : null}
        </div>
    )
}

export default OverlayedTabs
