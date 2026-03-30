import type { Meta, StoryObj } from '@storybook/react'
import { ArrowRight, ShieldAlert } from 'lucide-react'
import { Button } from './button'

const meta: Meta<typeof Button> = {
    title: 'UI/Primitives/Button',
    component: Button,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered'
    },
    args: {
        children: 'Launch Lobby',
        variant: 'primary',
        size: 'md'
    }
}

export default meta

type Story = StoryObj<typeof meta>

export const Primary: Story = {}

export const Secondary: Story = {
    args: {
        children: 'Browse Rooms',
        variant: 'secondary'
    }
}

export const Danger: Story = {
    args: {
        children: 'Destroy Lobby',
        variant: 'danger'
    }
}

export const Showcase: Story = {
    render: () => (
        <div className="flex flex-wrap gap-3">
            <Button>Enter</Button>
            <Button variant="secondary">Preview</Button>
            <Button variant="outline">
                Invite
                <ArrowRight className="size-4" />
            </Button>
            <Button variant="danger">
                <ShieldAlert className="size-4" />
                Reset
            </Button>
        </div>
    )
}
