import type { TChatMessage } from 'shared/contracts/app'

interface Props {
    message: TChatMessage
}

export const ChatMessageComponent: React.FC<Props> = ({ message }) => (
    <div className="rounded-2xl border border-white/8 bg-white/4 px-3 py-2 text-sm text-slate-100" style={{ overflowWrap: 'anywhere' }}>
        <b style={{ color: message.fromColor }}>{message.from}</b>&nbsp;{message.text}
    </div>
)
