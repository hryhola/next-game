import React from 'react'
import { Backdrop, CircularProgress } from '@mui/material'

type Props = {
    isLoading: boolean
    text?: string
    transitionDuration?: number
    zIndex?: number | 'auto'
}

export const LoadingOverlay: React.FC<Props> = ({ isLoading, text, transitionDuration, zIndex }) => {
    return (
        <Backdrop transitionDuration={transitionDuration} sx={{ zIndex: zIndex ?? (theme => theme.zIndex.drawer + 1) }} open={isLoading}>
            <CircularProgress color="inherit" />
            {text && <>&nbsp; {text}</>}
        </Backdrop>
    )
}
