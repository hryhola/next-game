import React, { useState, createContext } from 'react'
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader } from 'client/ui/primitives'

export interface GlobalModalOpenOptions {
    title: string
    header?: React.ReactNode
    inContainer?: boolean
    content?: React.ReactNode
    actionRequired?: boolean
    zIndex?: number
    actions?: React.ReactNode
}

export interface ConfirmModalOpenOptions {
    title: string
    header?: React.ReactNode
    inContainer?: boolean
    actionRequired?: boolean | 'confirm'
    content?: React.ReactNode
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
    children?: React.ReactNode
}

export const GlobalModalProvider: React.FC<Props> = props => {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [title, setTitle] = useState<string | null>(null)
    const [header, setHeader] = useState<React.ReactNode>(null)
    const [content, setContent] = useState<React.ReactNode>(null)
    const [actions, setActions] = useState<React.ReactNode>(null)
    const [inContainer, setInContainer] = useState(true)
    const [zIndex, setZIndex] = useState<undefined | number>(undefined)
    const [actionRequired, setActionRequired] = useState<boolean | 'confirm'>(false)

    const open = (options?: GlobalModalOpenOptions) => {
        setTitle(options?.title || null)
        setHeader(options?.header || null)
        setInContainer(options?.inContainer ?? true)
        setContent(options?.content || null)
        setActions(options?.actions || null)
        setIsModalOpen(true)
        setActionRequired(options?.actionRequired || false)
        setZIndex(options?.zIndex)

        return () => setIsModalOpen(false)
    }

    const close = () => {
        setIsModalOpen(false)
    }

    const confirm = (options: ConfirmModalOpenOptions) => {
        setTitle(options.title)
        setHeader(options?.header || null)
        setInContainer(options?.inContainer ?? true)
        setContent(options?.content || null)
        setActionRequired(options?.actionRequired || false)
        setActions(
            <>
                {options?.actionRequired !== 'confirm' ? (
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
                ) : (
                    <></>
                )}
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
        setZIndex(options.zIndex)

        return () => setIsModalOpen(false)
    }

    let calculatedContent = <></>

    if (content) {
        calculatedContent = typeof content === 'string' ? <DialogDescription>{content}</DialogDescription> : <>{content}</>
    }

    return (
        <GlobalModalCtx.Provider value={{ open, close, confirm }}>
            {props.children}
            <Dialog open={isModalOpen} onOpenChange={value => (!actionRequired ? setIsModalOpen(value) : undefined)}>
                {isModalOpen ? (
                    <DialogContent style={zIndex ? { zIndex } : undefined} title={title} titleVisuallyHidden>
                        {header || calculatedContent ? (
                            <DialogHeader>
                                {header ? <div className="text-2xl font-semibold text-white">{header}</div> : null}
                                {inContainer ? calculatedContent : null}
                            </DialogHeader>
                        ) : null}
                        {!inContainer ? calculatedContent : null}
                        {actions ? <DialogFooter>{actions}</DialogFooter> : null}
                    </DialogContent>
                ) : null}
            </Dialog>
        </GlobalModalCtx.Provider>
    )
}

export const useGlobalModal = () => {
    return React.useContext(GlobalModalCtx)
}
