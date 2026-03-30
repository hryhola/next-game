import type { Meta, StoryObj } from '@storybook/react'
import type { ComponentProps } from 'react'
import { Header } from './Header'
import { storybookUser } from 'client/storybook/mocks'

const meta: Meta<typeof Header> = {
    title: 'UI/Composite/Header',
    component: Header,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen',
        mockState: {
            user: storybookUser
        },
        nextjs: {
            navigation: {
                pathname: '/home'
            }
        }
    },
    render: (args: ComponentProps<typeof Header>) => (
        <div className="min-h-[220px] p-6">
            <Header {...args} />
        </div>
    )
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
