import type { Meta, StoryObj } from '@storybook/react'
import type { ComponentProps } from 'react'
import { ChatBox } from './ChatBox'
import { storybookChatMessages } from 'client/storybook/mocks'

const meta: Meta<typeof ChatBox> = {
    title: 'UI/Composite/ChatBox',
    component: ChatBox,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen'
    },
    args: {
        messages: storybookChatMessages,
        onSendMessage: () => {}
    },
    render: (args: ComponentProps<typeof ChatBox>) => (
        <div className="mx-auto h-[520px] w-full max-w-2xl p-6">
            <ChatBox {...args} />
        </div>
    )
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
