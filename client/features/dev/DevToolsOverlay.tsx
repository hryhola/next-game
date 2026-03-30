import { useEffect, useState } from 'react'
import { useWS } from 'client/context/list'
import { Button } from 'client/ui/primitives'
import { ChevronLeft, X } from 'lucide-react'

export const DevToolsOverlay: React.FC = () => {
    const [isEnabled, setIsEnabled] = useState(false)
    const [isVisible, setIsVisible] = useState(false)

    const ws = useWS()

    useEffect(() => {
        window.hiddenSecrets = window.hiddenSecrets || {}

        window.hiddenSecrets.enableDevTools = () => setIsEnabled(true)
        window.hiddenSecrets.disableDevTools = () => setIsEnabled(false)
    }, [])

    if (!isEnabled) {
        return <></>
    }

    return (
        <div className="fixed right-0 top-1/2 z-[9999] flex -translate-y-1/2 flex-col">
            {isVisible ? (
                <>
                    <Button variant="ghost" size="icon" onClick={() => setIsVisible(false)}>
                        <X className="size-4" />
                    </Button>
                    <Button variant="secondary" onClick={() => ws.wsRef.current?.close()}>
                        Close WS
                    </Button>
                </>
            ) : (
                <Button variant="secondary" size="icon" onClick={() => setIsVisible(true)}>
                    <ChevronLeft className="size-4" />
                </Button>
            )}
        </div>
    )
}
