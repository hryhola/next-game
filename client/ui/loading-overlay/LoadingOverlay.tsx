import React from 'react'
import { Backdrop, CircularProgress } from '@mui/material'

type Props = {
    isLoading: boolean
    text?: string
}

export const LoadingOverlay: React.FC<Props> = ({ isLoading, text }) => {
    return (
        <Backdrop sx={{ color: '#fff', zIndex: theme => theme.zIndex.drawer + 1 }} open={isLoading}>
            <CircularProgress color="inherit" />
            {text && <>&nbsp; {text}</>}
        </Backdrop>
    )
}
