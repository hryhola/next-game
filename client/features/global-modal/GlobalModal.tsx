import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material'
import React, { useState, createContext } from 'react'

export interface GlobalModalOpenOptions {
    header?: string | JSX.Element
    content?: string | JSX.Element
    actionRequired?: boolean
    actions?: JSX.Element
}

export interface ConfirmModalOpenOptions {
    header?: string | JSX.Element
    actionRequired?: boolean
    content?: string | JSX.Element
    zIndex?: number
    onConfirm: () => void
    onCancel?: () => void
}

export const GlobalModalCtx = createContext({
    open: (_options?: GlobalModalOpenOptions) => () => {},
    confirm: (_options: ConfirmModalOpenOptions) => () => {},
    close: () => {}
})

interface Props {
    children?: JSX.Element
}

export const GlobalModalProvider: React.FC<Props> = props => {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [header, setHeader] = useState<string | JSX.Element | null>(null)
    const [content, setContent] = useState<string | JSX.Element | null>(null)
    const [actions, setActions] = useState<JSX.Element | null>(null)
    const [isActionRequired, setIsActionRequired] = useState(false)

    const open = (options?: GlobalModalOpenOptions) => {
        setHeader(options?.header || null)
        setContent(options?.content || null)
        setActions(options?.actions || null)
        setIsModalOpen(true)
        setIsActionRequired(options?.actionRequired || false)

        return () => setIsModalOpen(false)
    }

    const close = () => {
        setIsModalOpen(false)
    }

    const confirm = (options: ConfirmModalOpenOptions) => {
        setHeader(options?.header || null)
        setContent(options?.content || null)
        setActions(
            <>
                <Button
                    onClick={() => {
                        if (options.onCancel) {
                            options.onCancel()
                        }
                        close()
                    }}
                >
                    Cancel
                </Button>
                <Button
                    onClick={() => {
                        options.onConfirm()
                        close()
                    }}
                >
                    Confirm
                </Button>
            </>
        )
        setIsModalOpen(true)
        setIsActionRequired(options?.actionRequired || false)

        return () => setIsModalOpen(false)
    }

    return (
        <GlobalModalCtx.Provider value={{ open, close, confirm }}>
            {props.children}
            <Dialog open={isModalOpen} {...(isActionRequired ? {} : { onClose: () => setIsModalOpen(false) })} sx={{ zIndex: 1099 }}>
                {header && <DialogTitle>{header}</DialogTitle>}
                {content && <DialogContent>{typeof content === 'string' ? <DialogContentText>{content}</DialogContentText> : content}</DialogContent>}
                {actions && <DialogActions>{actions}</DialogActions>}
            </Dialog>
        </GlobalModalCtx.Provider>
    )
}

export const useGlobalModal = () => {
    return React.useContext(GlobalModalCtx)
}
