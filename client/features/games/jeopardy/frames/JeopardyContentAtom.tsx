import React, { MutableRefObject, useCallback, useEffect, useState } from 'react'
import { useAudio, useI18n } from 'client/context/list'
import { Button } from 'client/ui/mui-shim'
import { Card, CardContent, CardFooter } from 'client/ui/primitives/card'
import { cn } from 'client/ui/lib/cn'
import { JeopardyMedia } from '../utils/jeopardyPackLoading'
import type { RealtimeJeopardyContentPlacement } from 'shared/contracts/jeopardy'

type JeopardyAtomType = 'html' | 'image' | 'text' | 'video' | 'voice'

type JeopardyContentAtomProps = {
    Resources: MutableRefObject<JeopardyMedia>
    content: string
    contentPlacement?: RealtimeJeopardyContentPlacement
    fullscreenCollapseButtonPosition?: 'bottom' | 'top'
    isRef?: boolean
    mediaAutoPlay?: boolean
    mediaControls?: boolean
    mediaElementRef?: MutableRefObject<HTMLAudioElement | HTMLVideoElement | null>
    onMediaEnded?: () => void
    type: JeopardyAtomType
}

export function resolveJeopardyPackContent(
    Resources: MutableRefObject<JeopardyMedia>,
    type: JeopardyAtomType,
    content: string,
    isRef: boolean | undefined
): string {
    if (!isRef) {
        return content
    }

    switch (type) {
        case 'image':
            return Resources.current.Images[content] || content
        case 'video':
            return Resources.current.Video[content] || content
        case 'voice':
            return Resources.current.Audio[content] || content
        default:
            return content
    }
}

function getTextCardPresentation(content: string) {
    const normalizedLength = content.trim().length

    if (normalizedLength <= 90) {
        return {
            fontSize: 'clamp(1.85rem, 4.8vw, 3.35rem)',
            lineHeight: 1.18,
            tier: 'short'
        } as const
    }

    if (normalizedLength <= 220) {
        return {
            fontSize: 'clamp(1.45rem, 3.5vw, 2.45rem)',
            lineHeight: 1.24,
            tier: 'medium'
        } as const
    }

    if (normalizedLength <= 420) {
        return {
            fontSize: 'clamp(1.12rem, 2.35vw, 1.68rem)',
            lineHeight: 1.34,
            tier: 'long'
        } as const
    }

    return {
        fontSize: 'clamp(0.98rem, 1.95vw, 1.24rem)',
        lineHeight: 1.45,
        tier: 'dense'
    } as const
}

function MediaCard(props: {
    alt: string
    children: React.ReactNode
    collapseLabel: string
    onToggleExpanded: () => void
    expanded: boolean
    expandedControlsPosition: 'bottom' | 'top'
    fullscreenLabel: string
    mediaCardStyle: React.CSSProperties
}) {
    const controls = (
        <div
            className={cn(
                'flex justify-center',
                props.expanded && props.expandedControlsPosition === 'top' && 'pointer-events-none fixed inset-x-0 top-4 z-[26] px-4'
            )}
            data-placement={props.expanded && props.expandedControlsPosition === 'top' ? 'top' : 'bottom'}
            data-testid="jeopardy-media-controls"
        >
            <Button className={cn(props.expanded && props.expandedControlsPosition === 'top' && 'pointer-events-auto')} onClick={props.onToggleExpanded}>
                {props.expanded ? props.collapseLabel : props.fullscreenLabel}
            </Button>
        </div>
    )

    return (
        <div
            className={cn(
                props.expanded
                    ? 'fixed inset-0 z-[25] flex items-center justify-center bg-slate-950/70 px-4 pb-4 pt-4 backdrop-blur-[2px] transition-[background-color,opacity] duration-300 ease-out sm:px-6 sm:pb-6'
                    : 'mx-auto flex w-full flex-col items-center gap-3 transition-[opacity,transform] duration-300 ease-out'
            )}
            data-expanded={props.expanded ? 'true' : 'false'}
            data-testid="jeopardy-media-shell"
            role={props.expanded ? 'dialog' : undefined}
            aria-label={props.expanded ? props.alt : undefined}
        >
            {props.expanded && props.expandedControlsPosition === 'top' ? controls : null}
            <div
                className={cn(
                    'flex w-full flex-col items-center',
                    props.expanded ? 'gap-4 transition-transform duration-300 ease-out' : 'max-w-[min(92vw,56rem)] gap-3 lg:max-w-[min(60vw,56rem)]'
                )}
            >
                <Card
                    className={cn(
                        'overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/88 transition-[transform,box-shadow,width,max-width,max-height] duration-300 ease-out',
                        props.expanded ? 'w-full shadow-[0_30px_90px_rgba(2,6,23,0.42)]' : 'shadow-[0_28px_80px_rgba(2,6,23,0.35)]'
                    )}
                    data-testid="jeopardy-media-card"
                    style={props.mediaCardStyle}
                >
                    {props.children}
                </Card>
                {!props.expanded || props.expandedControlsPosition === 'bottom' ? controls : null}
            </div>
        </div>
    )
}

export const JeopardyContentAtom: React.FC<JeopardyContentAtomProps> = props => {
    const {
        Resources,
        content,
        contentPlacement,
        fullscreenCollapseButtonPosition = 'bottom',
        isRef,
        mediaAutoPlay,
        mediaControls,
        mediaElementRef,
        onMediaEnded,
        type
    } = props
    const audio = useAudio()
    const { t } = useI18n()
    const [expanded, setExpanded] = useState(false)
    const [mediaAspectRatio, setMediaAspectRatio] = useState(16 / 9)
    const resolvedContent = resolveJeopardyPackContent(Resources, type, content, isRef)
    const textPresentation = getTextCardPresentation(content)

    const assignMediaElementRef = useCallback(
        (element: HTMLAudioElement | HTMLVideoElement | null) => {
            if (element) {
                element.volume = audio.volume / 100
            }

            if (mediaElementRef) {
                mediaElementRef.current = element
            }
        },
        [audio.volume, mediaElementRef]
    )

    useEffect(() => {
        if (!mediaElementRef?.current) {
            return
        }

        mediaElementRef.current.volume = audio.volume / 100
    }, [audio.volume, mediaElementRef])

    useEffect(() => {
        if (!expanded) {
            return
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setExpanded(false)
            }
        }

        window.addEventListener('keydown', handleKeyDown)

        return () => {
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [expanded])

    const updateAspectRatio = (width: number, height: number) => {
        if (!width || !height) {
            return
        }

        setMediaAspectRatio(width / height)
    }

    const collapsedMediaCardStyle = {
        aspectRatio: `${mediaAspectRatio}`,
        width: '100%',
        maxHeight: 'min(calc(var(--fullHeight) - var(--playersHeaderHeight, 0px) - 11rem), 64vh)'
    } satisfies React.CSSProperties
    const expandedMediaCardStyle = {
        width: 'calc(100vw - 2rem)',
        maxWidth: 'calc(100vw - 2rem)',
        height: 'calc(var(--fullHeight, 100vh) - 7rem)',
        maxHeight: 'calc(var(--fullHeight, 100vh) - 7rem)'
    } satisfies React.CSSProperties

    const mediaViewportClassName = cn(
        'flex items-center justify-center overflow-hidden bg-slate-950 transition-[transform] duration-300 ease-out',
        expanded ? 'h-full w-full scale-100' : 'h-full w-full scale-[0.995]'
    )

    switch (type) {
        case 'image':
            return (
                <MediaCard
                    alt={t('image.alt.questionImage')}
                    collapseLabel={t('jeopardy.collapseMedia')}
                    expanded={expanded}
                    expandedControlsPosition={fullscreenCollapseButtonPosition}
                    fullscreenLabel={t('jeopardy.fullscreenMedia')}
                    mediaCardStyle={expanded ? expandedMediaCardStyle : collapsedMediaCardStyle}
                    onToggleExpanded={() => setExpanded(current => !current)}
                >
                    <div className={mediaViewportClassName}>
                        <img
                            src={resolvedContent}
                            alt={t('image.alt.questionImage')}
                            className="h-full w-full object-contain"
                            onLoad={event => updateAspectRatio(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)}
                        />
                    </div>
                </MediaCard>
            )
        case 'video':
            return (
                <MediaCard
                    alt={t('image.alt.questionImage')}
                    collapseLabel={t('jeopardy.collapseMedia')}
                    expanded={expanded}
                    expandedControlsPosition={fullscreenCollapseButtonPosition}
                    fullscreenLabel={t('jeopardy.fullscreenMedia')}
                    mediaCardStyle={expanded ? expandedMediaCardStyle : collapsedMediaCardStyle}
                    onToggleExpanded={() => setExpanded(current => !current)}
                >
                    <div className={mediaViewportClassName}>
                        <video
                            ref={assignMediaElementRef as React.Ref<HTMLVideoElement>}
                            autoPlay={mediaAutoPlay}
                            controls={mediaControls ?? expanded}
                            className="h-full w-full object-contain"
                            onEnded={onMediaEnded}
                            onLoadedMetadata={event => updateAspectRatio(event.currentTarget.videoWidth, event.currentTarget.videoHeight)}
                            src={resolvedContent}
                        />
                    </div>
                </MediaCard>
            )
        case 'voice':
            return (
                <Card
                    className="mx-auto w-full max-w-[min(92vw,28rem)] overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/78 shadow-[0_28px_80px_rgba(2,6,23,0.35)]"
                    data-testid="jeopardy-audio-card"
                >
                    <CardContent className="px-4 pb-4 pt-4 sm:px-6 sm:pt-6">
                        <img
                            src="/assets/jeopardy/audio.gif"
                            alt={t('image.alt.audioQuestion')}
                            className="mx-auto mb-2 aspect-square w-full max-w-[18rem] object-contain"
                        />
                    </CardContent>
                    <CardFooter className="justify-center border-t border-white/10 px-4 pb-4 pt-3 sm:px-6 hidden">
                        <audio
                            ref={assignMediaElementRef as React.Ref<HTMLAudioElement>}
                            autoPlay={mediaAutoPlay}
                            onEnded={onMediaEnded}
                            src={resolvedContent}
                            className="hidden"
                            aria-hidden="true"
                        />
                    </CardFooter>
                </Card>
            )
        case 'html':
            return (
                <Card className="mx-auto w-full max-w-[min(94vw,52rem)] overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/80 shadow-[0_28px_80px_rgba(2,6,23,0.35)] lg:max-w-[min(64vw,52rem)]">
                    <CardContent className="max-h-[min(calc(var(--fullHeight)-var(--playersHeaderHeight,0px)-10rem),70vh)] overflow-auto px-5 py-5 text-left text-slate-100 sm:px-7 sm:py-7">
                        <div dangerouslySetInnerHTML={{ __html: resolvedContent }} />
                    </CardContent>
                </Card>
            )
        case 'text':
        default:
            return (
                <Card
                    className={cn(
                        'mx-auto w-full max-w-[min(92vw,42rem)] overflow-hidden rounded-[2rem] border shadow-[0_0_0_1px_rgba(139,92,246,0.2),0_0_56px_rgba(139,92,246,0.28),0_28px_80px_rgba(2,6,23,0.35)] lg:max-w-[min(58vw,51rem)]',
                        'border-violet-300/20',
                        contentPlacement === 'replic' ? 'bg-blue-950/72' : 'bg-slate-950/80'
                    )}
                    data-testid="jeopardy-text-card"
                >
                    <CardContent className="max-h-[min(calc(var(--fullHeight)-var(--playersHeaderHeight,0px)-10rem),72vh)] overflow-auto px-5 py-5 text-center sm:px-8 sm:py-8">
                        <div
                            className="whitespace-pre-wrap text-slate-50"
                            data-font-tier={textPresentation.tier}
                            style={{
                                fontSize: textPresentation.fontSize,
                                lineHeight: textPresentation.lineHeight
                            }}
                        >
                            {content}
                        </div>
                    </CardContent>
                </Card>
            )
    }
}
