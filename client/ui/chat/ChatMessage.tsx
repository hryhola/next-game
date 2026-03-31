import type { TChatMessage } from 'shared/contracts/app'

interface Props {
    message: TChatMessage
}

export const ChatMessageComponent: React.FC<Props> = ({ message }) =>
    message.kind === 'system' ? (
        <div className="text-center text-sm text-violet-200/75" style={{ overflowWrap: 'anywhere' }}>
            {message.parts?.length
                ? message.parts.map((part, index) => (
                      <span key={`${message.id}-${index}`} style={part.color ? { color: part.color } : undefined}>
                          {part.text}
                      </span>
                  ))
                : message.text}
        </div>
    ) : (
        <div className="text-sm text-slate-100" style={{ overflowWrap: 'anywhere' }}>
            <b style={{ color: message.fromColor }}>{message.from}</b>&nbsp;{message.text}
        </div>
    )
