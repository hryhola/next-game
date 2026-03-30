import React from 'react'
import { definePreview } from '@storybook/nextjs-vite'
import type { LobbyData, UserData } from 'state'
import { StorybookProviders } from 'client/storybook/StorybookProviders'
import '../app/globals.css'

type MockStateParameters = {
    user?: UserData
    lobby?: LobbyData
}

const preview = definePreview({
    parameters: {
        layout: 'fullscreen',
        nextjs: {
            appDirectory: true,
            navigation: {
                pathname: '/home'
            }
        },
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i
            }
        }
    },
    decorators: [
        (Story, context) => {
            const mockState = context.parameters.mockState as MockStateParameters | undefined

            return (
                <StorybookProviders key={context.id} user={mockState?.user} lobby={mockState?.lobby}>
                    <Story />
                </StorybookProviders>
            )
        }
    ]
})

export default preview
