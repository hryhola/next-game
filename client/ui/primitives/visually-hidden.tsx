import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'

type VisuallyHiddenProps = React.HTMLAttributes<HTMLElement> & {
    asChild?: boolean
}

const visuallyHiddenStyle: React.CSSProperties = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0
}

export const VisuallyHidden = React.forwardRef<HTMLElement, VisuallyHiddenProps>(({ asChild = false, style, ...props }, ref) => {
    const Comp = asChild ? Slot : 'span'

    return <Comp ref={ref} style={{ ...visuallyHiddenStyle, ...style }} {...props} />
})

VisuallyHidden.displayName = 'VisuallyHidden'
