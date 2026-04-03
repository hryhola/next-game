import React from 'react'
import { Box, Button, Divider } from 'client/ui/mui-shim'
import { useI18n, useLobby, useRequestHandler, useUser } from 'client/context/list'
import { useActionSender, useJeopardy } from '../JeopardyView'
import type { RealtimeJeopardyQuestionId, RealtimeJeopardyState, RealtimeJeopardyThemeId } from 'shared/contracts/jeopardy'

const BOARD_BOTTOM_PADDING_PX = 64
const BOARD_TOP_OFFSET_PX = 10
const BUTTON_HEIGHT_MIN_PX = 30
const BUTTON_HEIGHT_MAX_PX = 100
const DIVIDER_MARGIN_MIN_REM = 0.01
const DIVIDER_MARGIN_MAX_REM = 2
const DIVIDER_MARGIN_EXPONENT = 2.2
const DIVIDER_MARGIN_MAX_THEME_COUNT = 9
const DIVIDER_MARGIN_MIN_THEME_COUNT = 2
const THEME_HIDE_DURATION_MS = 520
const BOARD_RESERVED_SPACE_PX = 240

type BoardTheme = RealtimeJeopardyState.QuestionBoardFrame['themes'][number]
type RenderedTheme = {
    phase: 'hiding' | 'visible'
    theme: BoardTheme
}

function hasUnansweredQuestions(theme: BoardTheme) {
    return theme.question.some(question => !question.isAnswered)
}

function isThemeCleared(theme: BoardTheme) {
    return !hasUnansweredQuestions(theme)
}

function getDividerMarginRem(visibleThemeCount: number) {
    const boundedThemeCount = Math.min(DIVIDER_MARGIN_MAX_THEME_COUNT, Math.max(DIVIDER_MARGIN_MIN_THEME_COUNT, visibleThemeCount))
    const progress = (DIVIDER_MARGIN_MAX_THEME_COUNT - boundedThemeCount) / (DIVIDER_MARGIN_MAX_THEME_COUNT - DIVIDER_MARGIN_MIN_THEME_COUNT)
    const dividerMarginRem = DIVIDER_MARGIN_MIN_REM + Math.pow(progress, DIVIDER_MARGIN_EXPONENT) * (DIVIDER_MARGIN_MAX_REM - DIVIDER_MARGIN_MIN_REM)

    return `${dividerMarginRem.toFixed(3)}rem`
}

export const QuestionBoard: React.FC<RealtimeJeopardyState.QuestionBoardFrame> = props => {
    const sendAction = useActionSender()
    const user = useUser()
    const lobby = useLobby()
    const game = useJeopardy()
    const I18n = useI18n()

    const isMyTurn = props.pickerId === user.id
    const isMasterView = game.players.some(p => p.id === user.id && p.playerIsMaster)
    const [pendingPickedQuestionId, setPendingPickedQuestionId] = React.useState<RealtimeJeopardyQuestionId | null>(null)
    const pendingPickedQuestionIdRef = React.useRef<RealtimeJeopardyQuestionId | null>(null)
    const themeHideTimeoutsRef = React.useRef<Record<string, number>>({})
    const activePickedQuestionId = props.pickedQuestion || pendingPickedQuestionId
    const isPaused = Boolean(game.session?.isPaused)
    const canPickQuestions = !isPaused && lobby.myRole !== 'spectator' && (isMasterView || isMyTurn)
    const isBoardLocked = Boolean(activePickedQuestionId)
    const [renderedThemes, setRenderedThemes] = React.useState<RenderedTheme[]>(() =>
        props.themes.filter(theme => !isThemeCleared(theme)).map(theme => ({ phase: 'visible', theme }))
    )

    React.useEffect(() => {
        pendingPickedQuestionIdRef.current = pendingPickedQuestionId
    }, [pendingPickedQuestionId])

    React.useEffect(() => {
        if (props.pickedQuestion) {
            setPendingPickedQuestionId(null)
        }
    }, [props.pickedQuestion])

    React.useEffect(() => {
        setRenderedThemes(previousThemes => {
            const previousById = new Map(previousThemes.map(theme => [theme.theme.themeId, theme]))
            const incomingById = new Map(props.themes.map(theme => [theme.themeId, theme]))
            const orderedThemeIds = [...previousThemes.map(theme => theme.theme.themeId), ...props.themes.map(theme => theme.themeId)].filter(
                (themeId, index, themeIds) => themeIds.indexOf(themeId) === index
            )

            return orderedThemeIds.reduce<RenderedTheme[]>((nextThemes, themeId) => {
                const incomingTheme = incomingById.get(themeId)
                const previousTheme = previousById.get(themeId)

                if (incomingTheme) {
                    if (isThemeCleared(incomingTheme)) {
                        if (previousTheme) {
                            nextThemes.push({ phase: 'hiding', theme: previousTheme.theme })
                        }

                        return nextThemes
                    }

                    nextThemes.push({ phase: 'visible', theme: incomingTheme })
                    return nextThemes
                }

                if (previousTheme) {
                    nextThemes.push({ phase: 'hiding', theme: previousTheme.theme })
                }

                return nextThemes
            }, [])
        })
    }, [props.themes])

    React.useEffect(() => {
        renderedThemes.forEach(renderedTheme => {
            const themeId = renderedTheme.theme.themeId

            if (renderedTheme.phase === 'hiding') {
                if (themeHideTimeoutsRef.current[themeId]) {
                    return
                }

                themeHideTimeoutsRef.current[themeId] = window.setTimeout(() => {
                    setRenderedThemes(currentThemes => currentThemes.filter(theme => theme.theme.themeId !== themeId))
                    delete themeHideTimeoutsRef.current[themeId]
                }, THEME_HIDE_DURATION_MS)

                return
            }

            if (themeHideTimeoutsRef.current[themeId]) {
                window.clearTimeout(themeHideTimeoutsRef.current[themeId])
                delete themeHideTimeoutsRef.current[themeId]
            }
        })

        Object.keys(themeHideTimeoutsRef.current).forEach(themeId => {
            if (!renderedThemes.some(theme => theme.theme.themeId === themeId && theme.phase === 'hiding')) {
                window.clearTimeout(themeHideTimeoutsRef.current[themeId])
                delete themeHideTimeoutsRef.current[themeId]
            }
        })
    }, [renderedThemes])

    React.useEffect(
        () => () => {
            Object.values(themeHideTimeoutsRef.current).forEach(timeoutId => window.clearTimeout(timeoutId))
        },
        []
    )

    useRequestHandler('Game-SendAction', data => {
        if (
            !data.success &&
            pendingPickedQuestionIdRef.current &&
            ['already_picked', 'invalid_frame', 'invalid_payload', 'not_picker', 'question_answered', 'question_not_found'].includes(
                'code' in data && typeof data.code === 'string' ? data.code : ''
            )
        ) {
            setPendingPickedQuestionId(null)
        }
    })

    const handleQuestionPick: React.MouseEventHandler<HTMLButtonElement> = event => {
        const questionId = event.currentTarget.id as `${number}-${number}-${number}`

        if (activePickedQuestionId || isPaused) {
            return
        }

        setPendingPickedQuestionId(questionId)
        sendAction('$PickQuestion', {
            questionId
        })
    }

    const handleThemeSkip = (themeId: RealtimeJeopardyThemeId) => () => {
        if (isBoardLocked || isPaused) {
            return
        }

        sendAction('$SkipCategory', {
            themeId
        })
    }

    const visibleThemeCount = Math.max(
        renderedThemes.reduce((count, theme) => count + (theme.phase === 'visible' ? 1 : 0), 0),
        1
    )
    const buttonHeight = `clamp(${BUTTON_HEIGHT_MIN_PX}px, calc((var(--fullHeight) - var(--playersHeaderHeight) - ${
        BOARD_BOTTOM_PADDING_PX + BOARD_TOP_OFFSET_PX + BOARD_RESERVED_SPACE_PX
    }px) / ${visibleThemeCount}), ${BUTTON_HEIGHT_MAX_PX}px)`
    const dividerMarginY = getDividerMarginRem(visibleThemeCount)
    const boardVariables = {
        '--question-board-button-height': buttonHeight,
        '--question-board-divider-margin-y': dividerMarginY
    } as React.CSSProperties

    return (
        <Box
            sx={{
                pt: 'calc(var(--playersHeaderHeight) + 10px)',
                pb: '64px',
                transition: '0.5s',
                height: 'var(--fullHeight)',
                overflowY: 'auto',
                overflowX: 'hidden',
                boxSizing: 'border-box'
            }}
            style={boardVariables}
            width="100%"
        >
            <Box className="mx-auto w-full px-4 lg:max-w-[1080px] xl:max-w-[1240px]">
                {renderedThemes.map(({ phase, theme }) => {
                    const isThemeHiding = phase === 'hiding'

                    return (
                        <Box
                            key={theme.themeId}
                            sx={{
                                overflow: isThemeHiding ? 'hidden' : 'visible',
                                opacity: isThemeHiding ? 0 : 1,
                                maxHeight: isThemeHiding
                                    ? '0px'
                                    : 'calc(var(--question-board-button-height) + var(--question-board-divider-margin-y) * 2 + 112px)',
                                marginTop: isThemeHiding ? '0px' : undefined,
                                marginBottom: isThemeHiding ? '0px' : undefined,
                                pointerEvents: isThemeHiding ? 'none' : undefined,
                                transition: 'max-height 520ms ease, opacity 360ms ease, transform 520ms ease, margin 520ms ease',
                                transform: isThemeHiding ? 'translateY(-10px) scale(0.985)' : 'translateY(0) scale(1)'
                            }}
                        >
                            <Divider
                                style={{
                                    marginTop: 'var(--question-board-divider-margin-y)',
                                    marginBottom: 'var(--question-board-divider-margin-y)',
                                    transition: 'margin 520ms ease'
                                }}
                            >
                                <span className="inline-flex items-center gap-3">
                                    <span>{theme.name}</span>
                                    {isMasterView ? (
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            aria-label={`Skip ${theme.name}`}
                                            className="h-7 rounded-full px-2.5 text-xs font-medium uppercase tracking-[0.16em] text-violet-200/70 hover:bg-white/6 hover:text-violet-100"
                                            disabled={isPaused || isBoardLocked || !hasUnansweredQuestions(theme) || isThemeHiding}
                                            onClick={handleThemeSkip(theme.themeId)}
                                        >
                                            {I18n.t('common.skip')}
                                        </Button>
                                    ) : null}
                                </span>
                            </Divider>
                            <div className="py-1">
                                <div className="flex w-full gap-2">
                                    {theme.question.map(q => {
                                        const isActiveQuestion = activePickedQuestionId === q.questionId
                                        const isDisabled = !canPickQuestions || q.isAnswered || isBoardLocked || isThemeHiding

                                        return (
                                            <Button
                                                size="large"
                                                variant="text"
                                                key={q.questionId}
                                                id={q.questionId}
                                                style={{
                                                    height: 'var(--question-board-button-height)',
                                                    transition: 'height 520ms ease, background-color 220ms ease, box-shadow 220ms ease, color 220ms ease'
                                                }}
                                                className={[
                                                    'min-w-0 flex-1 border-0 shadow-none md:min-w-[7rem]',
                                                    isActiveQuestion
                                                        ? 'bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-slate-950 shadow-[0_18px_40px_rgba(139,92,246,0.35)] disabled:opacity-100'
                                                        : 'bg-white/4 text-violet-100 disabled:bg-white/4 disabled:text-violet-100/45',
                                                    canPickQuestions && !isBoardLocked && !q.isAnswered && !isThemeHiding
                                                        ? 'hover:bg-gradient-to-r hover:from-violet-500 hover:via-purple-500 hover:to-fuchsia-500 hover:text-slate-950 hover:shadow-[0_18px_40px_rgba(139,92,246,0.35)]'
                                                        : ''
                                                ].join(' ')}
                                                disabled={isDisabled}
                                                onClick={handleQuestionPick}
                                            >
                                                {!q.isAnswered ? q.price : ''}
                                            </Button>
                                        )
                                    })}
                                </div>
                            </div>
                        </Box>
                    )
                })}
            </Box>
        </Box>
    )
}
