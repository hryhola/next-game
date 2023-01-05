import { FormEventHandler, useState } from 'react'
import { ChatMessageComponent } from './ChatMessage'
import { TChatMessage } from 'model'
import { List, Input, IconButton, InputAdornment, TextField, FilledInput, Box, BoxTypeMap, SxProps, Theme } from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import FormControl from '@mui/material/FormControl'
import { GetProps } from 'react-redux'
import { type } from 'os'
import { OverridableComponent } from '@mui/material/OverridableComponent'

// type FormProps = React.DetailedHTMLProps<React.FormHTMLAttributes<HTMLFormElement>, HTMLFormElement>;

export type ChatSXProps = {
    sx?: SxProps<Theme>
    messagesWrapperBoxSx?: SxProps<Theme>
    inputSx?: SxProps<Theme>
}

type Props = ChatSXProps & {
    messages: TChatMessage[]
    onSendMessage: (message: string) => void
}

export const chatInputHeight = '56px'

export const Chat: React.FunctionComponent<Props> = props => {
    const [text, setText] = useState('')

    const handleMessageSent = () => {
        props.onSendMessage(text)
        setText('')
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
                    fullWidth
                    hiddenLabel
                    value={text}
                    onChange={e => setText(e.target.value)}
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
