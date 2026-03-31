import type { StorybookConfig } from '@storybook/nextjs-vite'

const config: StorybookConfig = {
    stories: ['../client/**/*.stories.@(ts|tsx)'],
    addons: ['@storybook/addon-docs', '@storybook/addon-a11y', '@storybook/addon-themes'],
    framework: {
        name: '@storybook/nextjs-vite',
        options: {}
    },
    typescript: {
        reactDocgen: false
    },
    staticDirs: ['../public'],
    docs: {
        autodocs: 'tag'
    }
}

export default config
