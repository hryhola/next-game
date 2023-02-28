import { useEffect, useState } from 'react'
import { useWS } from 'client/context/list'
import { Box, Button, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos'

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
        <Box sx={{ position: 'fixed', right: 0, top: '50%', display: 'flex', flexDirection: 'column', zIndex: 9999 }}>
            {isVisible ? (
                <>
                    <IconButton onClick={() => setIsVisible(false)}>
                        <CloseIcon />
                    </IconButton>
                    <Button onClick={() => ws.wsRef.current?.close()}>close WS</Button>
                </>
            ) : (
                <IconButton onClick={() => setIsVisible(true)}>
                    <ArrowBackIosIcon />
                </IconButton>
            )}
        </Box>
    )
}
