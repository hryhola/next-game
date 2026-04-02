module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/*.test.ts', '**/*.test.tsx'],
    moduleDirectories: ['node_modules', '<rootDir>'],
    transform: {
        '^.+\\.(ts|tsx|js|jsx)$': 'ts-jest'
    },
    moduleNameMapper: {
        '^client/ui/animated-background/AnimatedBackground$': '<rootDir>/client/test-utils/AnimatedBackground.mock.tsx',
        '^uuid$': '<rootDir>/client/test-utils/uuidMock.js',
        '\\.(css|less|scss|sass)$': '<rootDir>/client/test-utils/styleMock.js'
    },
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts']
}
