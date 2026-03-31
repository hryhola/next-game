import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import type { JeopardyPlayerData } from 'shared/contracts/app'
import type { RealtimeJeopardySessionState, RealtimeJeopardyState } from 'shared/contracts/jeopardy'
import { GameCtx, type GameCtxValue } from 'client/features/games/common/GameFactory'
import JeopardyPlayersHeader from '../JeopardyPlayersHeader'
import { storybookGuestUser, storybookLobby, storybookUser } from 'client/storybook/mocks'
import { FinalRoundBoard } from './JeopardyFinalRoundBoard'
import { FinalScore } from './JeopardyFinalScore'
import { PackPreview } from './JeopardyPackPreview'
import { QuestionBoard } from './JeopardyQuestionBoard'
import { QuestionContent } from './JeopardyQuestionContent'
import { RoundPreview } from './JeopardyRoundPreview'
import type { JeopardyMedia } from '../utils/jeopardyPackLoading'

const createPlayers = (): JeopardyPlayerData[] => [
    {
        ...storybookUser,
        memberIsCreator: true,
        memberIsPlayer: true,
        memberPosition: 0,
        memberRole: 'player',
        playerIsMaster: true,
        playerScore: 0
    },
    {
        ...storybookGuestUser,
        memberIsCreator: false,
        memberIsPlayer: true,
        memberPosition: 1,
        memberRole: 'player',
        playerIsMaster: false,
        playerScore: 1200
    },
    {
        id: 'user-rho',
        userNickname: 'Rho',
        userColor: '#a78bfa',
        userAvatarUrl: undefined,
        userIsOnline: true,
        memberIsCreator: false,
        memberIsPlayer: false,
        memberPosition: 2,
        memberRole: 'spectator',
        playerIsMaster: false,
        playerScore: 400
    }
]

const createGameValue = (frame: RealtimeJeopardyState.Frame): GameCtxValue => {
    const session: RealtimeJeopardySessionState = {
        frame,
        isPaused: false,
        internal: {
            answeredQuestions: [],
            currentAnsweringPlayerId: null,
            currentRoundId: 0,
            finalAnswers: {},
            finalBets: {},
            pickerId: frame.id === 'question-board' ? frame.pickerId : storybookGuestUser.id
        }
    }

    return {
        players: createPlayers(),
        isLoading: false,
        isSessionStarted: true,
        session,
        initialData: {
            pack: {
                public: true,
                value: '/storybook/mock.siq'
            }
        }
    }
}

const createBoardThemes = (themeCount: number): RealtimeJeopardyState.QuestionBoardFrame['themes'] =>
    Array.from({ length: themeCount }, (_, themeIndex) => ({
        name: `Category ${themeIndex + 1}`,
        themeId: `1-${themeIndex + 1}` as `${number}-${number}`,
        question: ['100', '200', '300', '400', '500'].map((price, questionIndex) => ({
            isAnswered: themeIndex === 0 && questionIndex === 0,
            price,
            questionId: `1-${themeIndex + 1}-${questionIndex + 1}` as `${number}-${number}-${number}`
        }))
    }))

const storybookWinner = {
    ...storybookGuestUser,
    playerIsMaster: false,
    playerScore: 3400
}

const viewportStyle = {
    '--fullHeight': '100vh'
} as React.CSSProperties

const StoryShell: React.FC<{
    children: React.ReactNode
    frame: RealtimeJeopardyState.Frame
    showHeader?: boolean
}> = ({ children, frame, showHeader = true }) => (
    <GameCtx.Provider value={createGameValue(frame)}>
        <div style={viewportStyle}>
            {showHeader ? <JeopardyPlayersHeader /> : null}
            {children}
        </div>
    </GameCtx.Provider>
)

const QuestionContentStory: React.FC<{ frame: RealtimeJeopardyState.QuestionContentFrame }> = ({ frame }) => {
    const resources = React.useRef<JeopardyMedia>({
        Audio: {},
        Images: {},
        Video: {}
    })

    return (
        <StoryShell frame={frame}>
            <QuestionContent {...frame} Resources={resources} packFetchingTimeMs={0} useMediaTimestamp={false} />
        </StoryShell>
    )
}

const FinalRoundBoardStory: React.FC<{ frame: RealtimeJeopardyState.FinalRoundBoardFrame }> = ({ frame }) => {
    const resources = React.useRef<JeopardyMedia>({
        Audio: {},
        Images: {},
        Video: {}
    })

    return (
        <StoryShell frame={frame}>
            <FinalRoundBoard {...frame} Resources={resources} />
        </StoryShell>
    )
}

const defaultBoardFrame: RealtimeJeopardyState.QuestionBoardFrame = {
    id: 'question-board',
    pickedQuestion: '1-2-3',
    pickerId: storybookGuestUser.id,
    roundId: 1,
    themes: createBoardThemes(5)
}

const overflowBoardFrame: RealtimeJeopardyState.QuestionBoardFrame = {
    ...defaultBoardFrame,
    themes: createBoardThemes(12)
}

const meta: Meta<typeof QuestionBoard> = {
    title: 'Games/Jeopardy/Frames',
    component: QuestionBoard,
    parameters: {
        layout: 'fullscreen',
        mockState: {
            user: storybookGuestUser,
            lobby: {
                ...storybookLobby,
                gameName: 'Jeopardy'
            }
        }
    }
}

export default meta

type Story = StoryObj<typeof meta>

export const PackPreviewStory: Story = {
    name: 'Pack Preview',
    render: () => (
        <StoryShell
            showHeader={false}
            frame={{
                id: 'pack-preview',
                author: 'Open Trivia Club',
                dateCreated: '2026-03-31',
                packName: 'World Capitals Warmup',
                themes: ['Mountains', 'Oceans', 'Landmarks', 'Flags', 'Cities', 'Currencies']
            }}
        >
            <PackPreview
                id="pack-preview"
                author="Open Trivia Club"
                dateCreated="2026-03-31"
                packName="World Capitals Warmup"
                themes={['Mountains', 'Oceans', 'Landmarks', 'Flags', 'Cities', 'Currencies']}
            />
        </StoryShell>
    )
}

export const RoundPreviewStory: Story = {
    name: 'Round Preview',
    render: () => (
        <StoryShell frame={{ id: 'rounds-preview', isRoundName: true, text: 'Round 1' }}>
            <RoundPreview id="rounds-preview" isRoundName text="Round 1" />
        </StoryShell>
    )
}

export const QuestionBoardStory: Story = {
    name: 'Question Board',
    render: () => (
        <StoryShell frame={defaultBoardFrame}>
            <QuestionBoard {...defaultBoardFrame} />
        </StoryShell>
    )
}

export const QuestionBoardOverflowStory: Story = {
    name: 'Question Board Overflow',
    render: () => (
        <StoryShell frame={overflowBoardFrame}>
            <QuestionBoard {...overflowBoardFrame} />
        </StoryShell>
    )
}

export const QuestionContentStorybook: Story = {
    name: 'Question Content',
    render: () => (
        <QuestionContentStory
            frame={{
                id: 'question-content',
                questionId: '1-3-2',
                type: 'text',
                content: 'This river flows through Vienna, Bratislava, Budapest, and Belgrade.',
                answeringPlayerId: null,
                answeringStatus: 'allowed',
                playersOnCooldown: [],
                playersWhoAnswered: [],
                skipVoted: [],
                answerRequestTimeLeft: 72,
                answerGivingTimeLeft: null,
                answerVerifyingTimeLeft: null
            }}
        />
    )
}

export const FinalRoundBoardStorybook: Story = {
    name: 'Final Round Board',
    render: () => (
        <FinalRoundBoardStory
            frame={{
                id: 'final-round-board',
                playersThatAnswered: [],
                playersThatMadeBet: [storybookGuestUser.id],
                skipperId: storybookGuestUser.id,
                status: 'skipping',
                themes: [
                    { name: 'Historic Europe', skipped: false },
                    { name: 'Space Race', skipped: false },
                    { name: 'Classic Literature', skipped: true },
                    { name: 'Science Icons', skipped: false }
                ]
            }}
        />
    )
}

export const FinalScoreStory: Story = {
    name: 'Final Score',
    render: () => (
        <StoryShell
            frame={{
                id: 'final-score',
                winner: storybookWinner
            }}
        >
            <FinalScore id="final-score" winner={storybookWinner} />
        </StoryShell>
    )
}
