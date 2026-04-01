import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'

export default defineConfig([
    ...nextVitals,
    {
        files: ['**/*.{js,jsx,ts,tsx}'],
        rules: {
            'react-hooks/exhaustive-deps': 'off',
            '@next/next/no-img-element': 'off'
        }
    },
    globalIgnores([
        '.next/**',
        'node_modules/**',
        'out/**',
        'storybook-static/**',
        'coverage/**',
        'SI/**',
        'trickster/**',
        'workers/realtime/worker-configuration.d.ts'
    ])
])
