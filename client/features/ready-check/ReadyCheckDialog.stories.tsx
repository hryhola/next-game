import type { Meta, StoryObj } from '@storybook/react'
import { ReadyCheckDialog } from './ReadyCheckDialog'
import { storybookLobby } from 'client/storybook/mocks'
import type { ReadyCheckMember } from 'shared/contracts/app'

const baseMembers: ReadyCheckMember[] = storybookLobby.members.slice(0, 4).map((member, index) => ({
    ...member,
    ready: index === 0 ? true : index === 1 ? false : undefined
}))

const meta: Meta<typeof ReadyCheckDialog> = {
    title: 'UI/Composite/ReadyCheckDialog',
    component: ReadyCheckDialog,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen',
        mockState: {
            user: storybookLobby.creator,
            lobby: storybookLobby
        }
    },
    args: {
        open: true,
        members: baseMembers
    }
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WaitingForVote: Story = {
    args: {
        members: baseMembers.map(member => ({ ...member, ready: undefined }))
    }
}

export const AlreadyVoted: Story = {
    args: {
        voted: true
    }
}
