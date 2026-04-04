/** @jest-environment jsdom */

import { fireEvent, screen } from '@testing-library/react'
import { createGameValue, createLobbyData, createPlayerData, createUserData, renderWithProviders } from 'client/test-utils/renderWithProviders'
import { LobbyControls } from './LobbyControls'

jest.mock('client/features/global-modal/GlobalModal', () => ({
    useGlobalModal: () => ({
        confirm: jest.fn(),
        open: jest.fn()
    })
}))

jest.mock('client/route/ClientRouter', () => ({
    useClientRouter: () => ({
        frame: 'Lobby',
        push: jest.fn(),
        refresh: jest.fn(),
        replace: jest.fn(),
        setFrame: jest.fn()
    })
}))

function createPlayers() {
    return [
        createPlayerData({
            id: 'creator',
            memberIsCreator: true,
            memberPosition: 0,
            playerIsMaster: true,
            userNickname: 'Creator'
        }),
        createPlayerData({
            id: 'player-1',
            memberPosition: 1,
            userNickname: 'Player 1'
        })
    ]
}

describe('LobbyControls', () => {
    it('toggles the lobby chat with Shift+C', () => {
        const players = createPlayers()

        renderWithProviders(<LobbyControls />, {
            game: createGameValue(),
            lobby: createLobbyData({
                id: 'lobby-1',
                members: players
            }),
            user: createUserData({
                id: 'player-1',
                userNickname: 'Player 1'
            })
        })

        expect(screen.queryByText('Lobby Chat')).not.toBeInTheDocument()

        fireEvent.keyDown(window, {
            key: 'C',
            shiftKey: true
        })

        expect(screen.getByText('Lobby Chat')).toBeInTheDocument()

        fireEvent.keyDown(window, {
            key: 'C',
            shiftKey: true
        })

        expect(screen.queryByText('Lobby Chat')).not.toBeInTheDocument()
    })

    it('ignores Shift+C while typing in the chat input', () => {
        const players = createPlayers()

        renderWithProviders(<LobbyControls />, {
            game: createGameValue(),
            lobby: createLobbyData({
                id: 'lobby-1',
                members: players
            }),
            user: createUserData({
                id: 'player-1',
                userNickname: 'Player 1'
            })
        })

        fireEvent.keyDown(window, {
            key: 'C',
            shiftKey: true
        })

        const input = screen.getByRole('textbox')

        fireEvent.keyDown(input, {
            key: 'C',
            shiftKey: true
        })

        expect(screen.getByText('Lobby Chat')).toBeInTheDocument()
    })
})
