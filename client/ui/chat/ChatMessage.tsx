import ListItem from '@mui/material/ListItem'
import { TChatMessage } from 'state'

interface Props {
    message: TChatMessage
}

export const ChatMessageComponent: React.FC<Props> = ({ message }) => (
    <ListItem sx={{ overflowWrap: 'anywhere' }}>
        <b style={{ display: 'contents' }}>{message.username}</b>&nbsp;{message.text}
    </ListItem>
)
