'use client'

import * as React from 'react'
import { Button as PrimitiveButton, Input as PrimitiveInput, Skeleton as PrimitiveSkeleton, Slider as PrimitiveSlider } from 'client/ui/primitives'
import { cn } from 'client/ui/lib/cn'

type Theme = {
    palette: {
        background: {
            default: string
        }
        primary: {
            main: string
            light: string
            contrastText: string
        }
        success: {
            main: string
            light: string
            contrastText: string
        }
        error: {
            main: string
            light: string
        }
        grey: {
            900: string
        }
    }
}

const theme: Theme = {
    palette: {
        background: {
            default: '#020617'
        },
        primary: {
            main: '#8b5cf6',
            light: '#c4b5fd',
            contrastText: '#f8fafc'
        },
        success: {
            main: '#34d399',
            light: '#6ee7b7',
            contrastText: '#022c22'
        },
        error: {
            main: '#fb7185',
            light: '#fda4af'
        },
        grey: {
            900: '#0f172a'
        }
    }
}

type ThemeScalar = string | number | null | undefined
type ThemeAwareScalar = ThemeScalar | ((theme: Theme) => ThemeScalar)
type StyleObject = Record<string, ThemeAwareScalar>
type StyleLike = StyleObject | ((theme: Theme) => StyleObject) | undefined

type BaseProps<T extends HTMLElement = HTMLDivElement> = React.HTMLAttributes<T> &
    Record<string, unknown> & {
        sx?: StyleLike
        component?: React.ElementType
    }

const directStyleKeys = [
    'width',
    'height',
    'minWidth',
    'minHeight',
    'maxWidth',
    'maxHeight',
    'display',
    'flexDirection',
    'justifyContent',
    'justifyItems',
    'alignItems',
    'alignContent',
    'alignSelf',
    'textAlign',
    'overflow',
    'overflowX',
    'overflowY',
    'position',
    'top',
    'right',
    'bottom',
    'left',
    'zIndex',
    'background',
    'backgroundColor',
    'borderRadius',
    'visibility',
    'pointerEvents',
    'opacity',
    'boxSizing',
    'transition',
    'wordBreak',
    'color',
    'padding',
    'paddingTop',
    'paddingBottom',
    'paddingLeft',
    'paddingRight',
    'margin',
    'marginTop',
    'marginBottom',
    'marginLeft',
    'marginRight',
    'gap',
    'rowGap',
    'columnGap'
] as const

const shorthandMap = {
    p: 'padding',
    pt: 'paddingTop',
    pb: 'paddingBottom',
    pl: 'paddingLeft',
    pr: 'paddingRight',
    m: 'margin',
    mt: 'marginTop',
    mb: 'marginBottom',
    ml: 'marginLeft',
    mr: 'marginRight'
} as const

const resolveThemeValue = (value: ThemeAwareScalar) => {
    const resolved = typeof value === 'function' ? value(theme) : value

    return resolved ?? undefined
}

const setStyleValue = (style: React.CSSProperties, key: string, value: ThemeAwareScalar, spacing = false) => {
    const resolved = resolveThemeValue(value)

    if (resolved === undefined) {
        return
    }

    ;(style as Record<string, string | number | undefined>)[key] = spacing && typeof resolved === 'number' ? `${resolved * 8}px` : resolved
}

const extractStyleProps = (source: Record<string, unknown>) => {
    const style: React.CSSProperties = {}
    const passthrough: Record<string, unknown> = { ...source }

    directStyleKeys.forEach(key => {
        if (key in passthrough) {
            setStyleValue(style, key, passthrough[key] as ThemeAwareScalar)
            delete passthrough[key]
        }
    })

    Object.entries(shorthandMap).forEach(([key, cssKey]) => {
        if (key in passthrough) {
            setStyleValue(style, cssKey, passthrough[key] as ThemeAwareScalar, true)
            delete passthrough[key]
        }
    })

    if ('px' in passthrough) {
        setStyleValue(style, 'paddingLeft', passthrough.px as ThemeAwareScalar, true)
        setStyleValue(style, 'paddingRight', passthrough.px as ThemeAwareScalar, true)
        delete passthrough.px
    }

    if ('py' in passthrough) {
        setStyleValue(style, 'paddingTop', passthrough.py as ThemeAwareScalar, true)
        setStyleValue(style, 'paddingBottom', passthrough.py as ThemeAwareScalar, true)
        delete passthrough.py
    }

    if ('mx' in passthrough) {
        setStyleValue(style, 'marginLeft', passthrough.mx as ThemeAwareScalar, true)
        setStyleValue(style, 'marginRight', passthrough.mx as ThemeAwareScalar, true)
        delete passthrough.mx
    }

    if ('my' in passthrough) {
        setStyleValue(style, 'marginTop', passthrough.my as ThemeAwareScalar, true)
        setStyleValue(style, 'marginBottom', passthrough.my as ThemeAwareScalar, true)
        delete passthrough.my
    }

    return {
        style,
        props: passthrough
    }
}

const resolveSx = (sx: StyleLike) => {
    if (!sx) {
        return undefined
    }

    return extractStyleProps(typeof sx === 'function' ? sx(theme) : sx).style
}

type ElementProps = {
    className?: string
    style?: React.CSSProperties
    sx?: StyleLike
    children?: React.ReactNode
}

export function Box({ component, sx, style, children, ...props }: BaseProps<HTMLDivElement>) {
    const Comp: React.ElementType = component || 'div'
    const extracted = extractStyleProps(props)

    return (
        <Comp style={{ ...extracted.style, ...resolveSx(sx), ...style }} {...extracted.props}>
            {children}
        </Comp>
    )
}

type GridProps = BaseProps<HTMLDivElement> & {
    container?: boolean
    item?: boolean
    spacing?: number
    direction?: React.CSSProperties['flexDirection']
    wrap?: React.CSSProperties['flexWrap']
}

export function Grid({ container, item: _item, spacing, direction, wrap, sx, style, children, ...props }: GridProps) {
    const extracted = extractStyleProps(props)

    return (
        <div
            style={{
                display: container ? 'flex' : undefined,
                gap: typeof spacing === 'number' ? `${spacing * 4}px` : undefined,
                flexDirection: direction,
                flexWrap: wrap,
                ...extracted.style,
                ...resolveSx(sx),
                ...style
            }}
            {...extracted.props}
        >
            {children}
        </div>
    )
}

type TypographyProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'color'> &
    Record<string, unknown> & {
        variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h6' | 'body1' | 'overline'
        sx?: StyleLike
        color?: ThemeAwareScalar
        align?: React.CSSProperties['textAlign']
        component?: React.ElementType
    }

export function Typography({ variant = 'body1', sx, style, color, align, component, children, ...props }: TypographyProps) {
    const extracted = extractStyleProps(props)
    const Comp: React.ElementType =
        component || (variant === 'h1' ? 'h1' : variant === 'h2' ? 'h2' : variant === 'h3' ? 'h3' : variant === 'h4' ? 'h4' : variant === 'h6' ? 'h6' : 'div')

    const fontSize =
        variant === 'h1'
            ? '3rem'
            : variant === 'h2'
            ? '2.5rem'
            : variant === 'h3'
            ? '2rem'
            : variant === 'h4'
            ? '1.5rem'
            : variant === 'h6'
            ? '1.125rem'
            : variant === 'overline'
            ? '0.75rem'
            : '1rem'

    return (
        <Comp
            style={{
                fontSize,
                textAlign: align,
                letterSpacing: variant === 'overline' ? '0.22em' : undefined,
                textTransform: variant === 'overline' ? 'uppercase' : undefined,
                color: resolveThemeValue(color),
                ...extracted.style,
                ...resolveSx(sx),
                ...style
            }}
            {...extracted.props}
        >
            {children}
        </Comp>
    )
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'contained' | 'outlined' | 'text'
    color?: 'primary' | 'secondary' | 'error' | 'success'
    size?: 'small' | 'medium' | 'large'
    fullWidth?: boolean
    sx?: StyleLike
}

export function Button({ variant = 'contained', color = 'primary', size = 'medium', fullWidth, sx, style, className, ...props }: ButtonProps) {
    const mappedVariant = color === 'error' ? 'danger' : variant === 'contained' ? 'primary' : variant === 'outlined' ? 'outline' : 'ghost'
    const mappedSize = size === 'large' ? 'lg' : size === 'small' ? 'sm' : 'md'

    return (
        <PrimitiveButton
            className={cn(fullWidth && 'w-full', className)}
            variant={mappedVariant as never}
            size={mappedSize as never}
            style={{ ...resolveSx(sx), ...style }}
            {...props}
        />
    )
}

export function Skeleton({ sx, style, ...props }: React.HTMLAttributes<HTMLDivElement> & { sx?: StyleLike; variant?: string }) {
    return <PrimitiveSkeleton style={{ ...resolveSx(sx), ...style }} {...props} />
}

export function Divider({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className="my-3 flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.25em] text-violet-200/55" {...props}>
            <span className="h-px flex-1 bg-white/10" />
            {children ? <span>{children}</span> : null}
            <span className="h-px flex-1 bg-white/10" />
        </div>
    )
}

export function Dialog({
    open,
    children,
    sx,
    style
}: {
    open?: boolean
    children: React.ReactNode
    sx?: StyleLike
    disableEnforceFocus?: boolean
    style?: React.CSSProperties
}) {
    if (!open) {
        return null
    }

    return (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/72 backdrop-blur-sm" style={{ ...resolveSx(sx), ...style }}>
            {children}
        </div>
    )
}

export const DialogTitle: React.FC<ElementProps> = ({ sx, style, className, ...props }) => (
    <div className={cn('text-xl font-semibold text-white', className)} style={{ ...resolveSx(sx), ...style }} {...props} />
)

export const DialogContent: React.FC<ElementProps> = ({ sx, style, className, ...props }) => (
    <div className={cn('glass-card p-6', className)} style={{ ...resolveSx(sx), ...style }} {...props} />
)

export const DialogActions: React.FC<ElementProps> = ({ sx, style, className, ...props }) => (
    <div className={cn('mt-4 flex items-center justify-end gap-3', className)} style={{ ...resolveSx(sx), ...style }} {...props} />
)

export const DialogContentText: React.FC<React.HTMLAttributes<HTMLParagraphElement> & { sx?: StyleLike }> = ({ sx, style, className, ...props }) => (
    <p className={cn('text-sm text-slate-300', className)} style={{ ...resolveSx(sx), ...style }} {...props} />
)

export function List(props: React.HTMLAttributes<HTMLDivElement>) {
    return <div className="flex flex-col gap-2" {...props} />
}

export function ListItem({ disablePadding, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { disablePadding?: boolean }) {
    return <div className={cn('rounded-2xl border border-white/6 bg-white/4', disablePadding ? '' : 'px-3 py-2', className)} {...props} />
}

export function ListItemButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return <button className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left transition hover:bg-white/6" {...props} />
}

export function Table({ size: _size, ...props }: React.TableHTMLAttributes<HTMLTableElement> & { size?: string }) {
    return <table className="w-full border-collapse text-left" {...props} />
}

export function TableHead(props: React.HTMLAttributes<HTMLTableSectionElement>) {
    return <thead {...props} />
}

export function TableBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
    return <tbody {...props} />
}

export function TableRow(props: React.HTMLAttributes<HTMLTableRowElement>) {
    return <tr className="border-b border-white/10" {...props} />
}

export function TableCell({ sx, style, className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & { sx?: StyleLike }) {
    return <td className={cn('px-3 py-2 text-sm text-slate-200', className)} style={{ ...resolveSx(sx), ...style }} {...props} />
}

type TextFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
    inputRef?: React.Ref<HTMLInputElement | HTMLTextAreaElement>
    label?: string
    helperText?: React.ReactNode
    error?: boolean
    fullWidth?: boolean
    multiline?: boolean
    sx?: StyleLike
}

export function TextField({ inputRef, label, sx, style, helperText, error, multiline, className, ...props }: TextFieldProps) {
    const inputClassName = cn('glass-input glass-focus rounded-2xl px-4 py-3', className)

    return (
        <label className="flex w-full flex-col gap-2 text-sm text-slate-200" style={{ ...resolveSx(sx), ...style }}>
            {label ? <span>{label}</span> : null}
            {multiline ? (
                <textarea
                    ref={inputRef as React.Ref<HTMLTextAreaElement>}
                    className={cn(inputClassName, 'min-h-24')}
                    {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
                />
            ) : (
                <PrimitiveInput ref={inputRef as React.Ref<HTMLInputElement>} className={cn('h-12', className)} {...props} />
            )}
            {helperText ? <span className={error ? 'text-rose-300' : 'text-slate-400'}>{helperText}</span> : null}
        </label>
    )
}

type SliderProps = Omit<React.ComponentProps<typeof PrimitiveSlider>, 'value' | 'defaultValue' | 'onValueChange' | 'onChange'> & {
    sx?: StyleLike
    value?: number | number[]
    defaultValue?: number | number[]
    onChange?: (_event: unknown, value: number) => void
    onValueChange?: (value: number[]) => void
    valueLabelDisplay?: 'off' | 'auto' | 'on'
}

export function Slider({ value, defaultValue, onChange, onValueChange, valueLabelDisplay: _valueLabelDisplay, sx, style, ...props }: SliderProps) {
    const resolvedValue = Array.isArray(value) ? value : typeof value === 'number' ? [value] : undefined
    const resolvedDefaultValue = Array.isArray(defaultValue) ? defaultValue : typeof defaultValue === 'number' ? [defaultValue] : undefined

    return (
        <PrimitiveSlider
            value={resolvedValue}
            defaultValue={resolvedDefaultValue}
            onValueChange={next => {
                onValueChange?.(next)
                onChange?.(undefined, next[0] ?? 0)
            }}
            style={{ ...resolveSx(sx), ...style }}
            {...props}
        />
    )
}

export function LinearProgress({
    value = 0,
    color,
    sx,
    style
}: {
    value?: number
    sx?: StyleLike
    color?: 'success' | 'secondary' | 'primary'
    variant?: string
    style?: React.CSSProperties
}) {
    const gradient =
        color === 'success' ? 'from-emerald-400 to-lime-300' : color === 'secondary' ? 'from-fuchsia-400 to-violet-400' : 'from-violet-400 to-fuchsia-400'

    return (
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10" style={{ ...resolveSx(sx), ...style }}>
            <div className={cn('h-full rounded-full bg-gradient-to-r', gradient)} style={{ width: `${value}%` }} />
        </div>
    )
}

export function Zoom({ children }: { children: React.ReactNode; in?: boolean }) {
    return <>{children}</>
}
