import { Upload, UserRound } from 'lucide-react'
import { cn } from 'client/ui/lib/cn'
import { Button } from 'client/ui/primitives'

interface Props {
    url?: string
    local?: boolean
    size?: number
    plain?: boolean
    editable?: boolean
    clickable?: boolean
    onClick?: (event: React.MouseEvent<HTMLElement>) => void
    onChange?: (image: File) => void
    maxSize?: string
    editBorder?: boolean
    editIcon?: React.ReactNode
    editLabel?: string
    color?: string
    filter?: string
}

export const ProfilePicture: React.FC<Props> = props => {
    const size = props.size || 300
    const frameClassName = props.plain ? 'rounded-none border-none bg-transparent' : 'rounded-3xl border border-white/10 bg-white/5'
    const emptyFrameClassName = props.plain ? 'rounded-none border-none bg-transparent' : 'rounded-3xl border border-white/10 bg-violet-500/10'
    const editableFrameClassName = props.plain ? 'rounded-none border-none bg-transparent' : 'rounded-3xl border border-white/10 bg-violet-500/12'

    const sizeProps = {
        width: size + 'px',
        height: size + 'px',
        maxHeight: undefined as undefined | string,
        maxWidth: undefined as undefined | string
    }

    if (props.maxSize) {
        sizeProps.maxHeight = props.maxSize
        sizeProps.maxWidth = props.maxSize
    }

    if (!props.editable && !props.clickable) {
        if (!props.url) {
            return (
                <div className={cn('flex items-center justify-center overflow-hidden', emptyFrameClassName)} style={sizeProps}>
                    <UserRound style={{ color: props.color, filter: props.filter, width: sizeProps.width, height: sizeProps.height }} />
                </div>
            )
        }

        return (
            <div className={cn('flex items-center justify-center overflow-hidden', frameClassName)} style={{ ...sizeProps, filter: props.filter }}>
                <img alt="user avatar" src={props.url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
        )
    }

    const content = (
        <>
            {props.editable && (
                <input
                    type="file"
                    name="image"
                    accept="image/*"
                    {...(props.onChange ? { onChange: e => e.target.files?.[0] && props.onChange!(e.target.files[0]) } : {})}
                    hidden
                />
            )}
            {props.url ? (
                <img alt="user avatar" src={props.url} style={{ filter: props.filter, width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
                <>
                    <div className={cn('flex size-full items-center justify-center', editableFrameClassName)}>
                        {props.editIcon || <UserRound style={{ color: props.color, filter: props.filter, width: sizeProps.width, height: sizeProps.height }} />}
                    </div>
                    {props.editable ? <Upload className="absolute bottom-5 right-5 size-5 text-white/80" /> : null}
                    {props.editLabel ? <span className="text-xs text-slate-300">{props.editLabel}</span> : null}
                </>
            )}
        </>
    )

    const sharedClassName = cn(
        'relative flex flex-col gap-2 overflow-hidden p-0',
        props.plain ? 'rounded-none' : 'rounded-3xl',
        props.editBorder === true ? 'border border-white/15' : 'border-none bg-transparent shadow-none'
    )

    if (props.editable) {
        return (
            <label className={cn(sharedClassName, 'cursor-pointer')} style={sizeProps}>
                {content}
            </label>
        )
    }

    return (
        <Button type="button" variant="secondary" className={sharedClassName} style={sizeProps} {...(props.clickable ? { onClick: props.onClick } : {})}>
            {content}
        </Button>
    )
}
