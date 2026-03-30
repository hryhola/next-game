import type { Meta, StoryObj } from '@storybook/react'
import type { ComponentProps } from 'react'
import { LobbyPreview } from './LobbyPreview'
import { storybookLobby, storybookPrivateLobby, storybookUser } from 'client/storybook/mocks'

const meta: Meta<typeof LobbyPreview> = {
    title: 'UI/Composite/LobbyPreview',
    component: LobbyPreview,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
        mockState: {
            user: storybookUser,
            lobby: storybookLobby
        },
        nextjs: {
            navigation: {
                pathname: '/home'
            }
        }
    },
    args: {
        lobby: storybookLobby
    },
    render: (args: ComponentProps<typeof LobbyPreview>) => (
        <div className="w-[420px]">
            <LobbyPreview {...args} />
        </div>
    )
}

export default meta

type Story = StoryObj<typeof meta>

export const PublicLobby: Story = {}

export const PrivateLobby: Story = {
    args: {
        lobby: storybookPrivateLobby
    },
    parameters: {
        mockState: {
            user: storybookUser,
            lobby: storybookPrivateLobby
        }
    }
}
