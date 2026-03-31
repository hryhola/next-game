import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import type { JeopardyPlayerData } from 'shared/contracts/app'
import type { RealtimeJeopardySessionInternal, RealtimeJeopardySessionState, RealtimeJeopardyState } from 'shared/contracts/jeopardy'
import { GameCtx, type GameCtxValue } from 'client/features/games/common/GameFactory'
import { storybookGuestUser, storybookLobby, storybookUser } from 'client/storybook/mocks'
import { QuestionContent } from './JeopardyQuestionContent'
import type { JeopardyMedia } from '../utils/jeopardyPackLoading'

const createPlayers = (): JeopardyPlayerData[] => [
    {
        ...storybookUser,
        memberIsCreator: true,
        memberIsPlayer: true,
        memberPosition: 0,
        memberRole: 'player',
        playerIsMaster: true,
        playerScore: 1600
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

const viewportStyle = {
    '--fullHeight': '100vh'
} as React.CSSProperties

const createGameValue = (frame: RealtimeJeopardyState.QuestionContentFrame, internal?: Partial<RealtimeJeopardySessionInternal>): GameCtxValue => {
    const session: RealtimeJeopardySessionState = {
        frame,
        isPaused: false,
        internal: {
            answeredQuestions: [],
            currentAnsweringPlayerId: null,
            currentRoundId: 0,
            finalAnswers: {},
            finalBets: {},
            pickerId: storybookUser.id,
            ...internal
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

const QuestionModalStory: React.FC<{
    frame: RealtimeJeopardyState.QuestionContentFrame
    internal?: Partial<RealtimeJeopardySessionInternal>
}> = ({ frame, internal }) => {
    const resources = React.useRef<JeopardyMedia>({
        Audio: {},
        Images: {},
        Video: {}
    })

    return (
        <GameCtx.Provider value={createGameValue(frame, internal)}>
            <div style={viewportStyle}>
                <QuestionContent {...frame} Resources={resources} packFetchingTimeMs={0} useMediaTimestamp={false} />
            </div>
        </GameCtx.Provider>
    )
}

const questionFrameBase: RealtimeJeopardyState.QuestionContentFrame = {
    id: 'question-content',
    questionId: '1-3-2',
    type: 'text',
    content: 'This river flows through Vienna, Bratislava, Budapest, and Belgrade.',
    answeringPlayerId: null,
    answeringStatus: 'allowed',
    playersOnCooldown: [],
    playersWhoAnswered: [],
    skipVoted: [],
    answerRequestTimeLeft: null,
    answerGivingTimeLeft: null,
    answerVerifyingTimeLeft: null
}

const meta: Meta<typeof QuestionContent> = {
    title: 'Games/Jeopardy/Modals',
    component: QuestionContent,
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

export const Answering: Story = {
    render: () => (
        <QuestionModalStory
            frame={{
                ...questionFrameBase,
                answeringPlayerId: storybookGuestUser.id,
                answeringStatus: 'answering',
                answerGivingTimeLeft: 68
            }}
        />
    )
}

export const VerifyingAnswer: Story = {
    parameters: {
        mockState: {
            user: storybookUser,
            lobby: {
                ...storybookLobby,
                gameName: 'Jeopardy'
            }
        }
    },
    render: () => (
        <QuestionModalStory
            frame={{
                ...questionFrameBase,
                answeringPlayerId: storybookGuestUser.id,
                answeringStatus: 'answer-verifying',
                answerVerifyingTimeLeft: 54
            }}
            internal={{
                currentAnsweringPlayerId: storybookGuestUser.id,
                currentAnsweringPlayerAnswerText: 'Danube',
                correctAnswers: ['Danube', 'The Danube River'],
                incorrectAnswers: ['Rhine']
            }}
        />
    )
}
