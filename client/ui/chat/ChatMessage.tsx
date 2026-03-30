import type { TChatMessage } from 'shared/contracts/app'

interface Props {
    message: TChatMessage
}

export const ChatMessageComponent: React.FC<Props> = ({ message }) => (
    <div className="text-sm text-slate-100" style={{ overflowWrap: 'anywhere' }}>
        <b style={{ color: message.fromColor }}>{message.from}</b>&nbsp;{message.text}
    </div>
)
