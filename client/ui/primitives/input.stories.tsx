import type { Meta, StoryObj } from '@storybook/react'
import type { ComponentProps } from 'react'
import { Input } from './input'

const meta: Meta<typeof Input> = {
    title: 'UI/Primitives/Input',
    component: Input,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered'
    },
    args: {
        placeholder: 'Lobby password'
    },
    render: (args: ComponentProps<typeof Input>) => (
        <div className="w-[360px]">
            <Input {...args} />
        </div>
    )
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Filled: Story = {
    args: {
        value: 'amethyst-key'
    }
}
