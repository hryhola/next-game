import { FormEventHandler, RefObject, useState } from 'react'
import { ChatMessageComponent } from './ChatMessage'
import { TChatMessage } from 'state'
import { List, IconButton, InputAdornment, FilledInput, Box, SxProps, Theme } from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import FormControl from '@mui/material/FormControl'

export type ChatSXProps = {
    sx?: SxProps<Theme>
    messagesWrapperBoxSx?: SxProps<Theme>
    inputSx?: SxProps<Theme>
    inputRef?: RefObject<HTMLInputElement>
}

type Props = ChatSXProps & {
    messages: TChatMessage[]
    onSendMessage: (message: string) => void
}

export const chatInputHeight = '56px'

export const ChatBox: React.FunctionComponent<Props> = props => {
    const [text, setText] = useState('')

    const handleMessageSent = () => {
        if (text.trim().length) {
            props.onSendMessage(text.trim())
            setText('')
        }
    }

    const handleFormSubmit: FormEventHandler<HTMLFormElement> = e => {
        e.preventDefault()
        handleMessageSent()
    }

    return (
        <Box component="form" sx={props.sx || {}} onSubmit={handleFormSubmit}>
            <List dense sx={{ display: 'flex', flexDirection: 'column-reverse', overflowY: 'scroll', ...(props.messagesWrapperBoxSx || {}) }}>
                {props.messages.map(message => (
                    <ChatMessageComponent key={message.id} message={message} />
                ))}
            </List>
            <FormControl sx={props.inputSx || { height: chatInputHeight }} fullWidth variant="filled">
                <FilledInput
                    disableUnderline
                    fullWidth
                    hiddenLabel
                    value={text}
                    onChange={e => setText(e.target.value)}
                    {...(props.inputRef
                        ? {
                              inputRef: props.inputRef
                          }
                        : {})}
                    endAdornment={
                        <InputAdornment position="end">
                            <IconButton size="small" onClick={handleMessageSent}>
                                <SendIcon />
                            </IconButton>
                        </InputAdornment>
                    }
                />
            </FormControl>
        </Box>
    )
}
