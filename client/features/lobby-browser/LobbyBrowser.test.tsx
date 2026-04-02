/** @jest-environment jsdom */

import { act, fireEvent, screen } from '@testing-library/react'
import { LobbyBrowser } from './LobbyBrowser'
import { createWSHarness, renderWithProviders } from 'client/test-utils/renderWithProviders'

describe('LobbyBrowser', () => {
    it('hydrates, updates, filters, and unsubscribes the realtime lobby list', () => {
        const ws = createWSHarness()
        const { unmount } = renderWithProviders(<LobbyBrowser />, { ws })

        expect(ws.send).toHaveBeenCalledWith('Lobby-GetList')
        expect(ws.send).toHaveBeenCalledWith('Universal-Subscription', {
            mode: 'subscribe',
            scope: 'global',
            topic: 'Lobby-ListUpdated'
        })

        act(() => {
            ws.emit('Lobby-GetList', {
                lobbies: [
                    { id: 'Alpha', private: false },
                    { id: 'Beta', private: true }
                ]
            })
        })

        expect(screen.getByText('Alpha')).toBeInTheDocument()
        expect(screen.getByText('Beta')).toBeInTheDocument()

        act(() => {
            ws.emit('Lobby-ListUpdated', {
                lobbies: [
                    { id: 'Beta', private: true },
                    { id: 'Gamma', private: false }
                ]
            })
        })

        expect(screen.queryByText('Alpha')).not.toBeInTheDocument()
        expect(screen.getByText('Beta')).toBeInTheDocument()
        expect(screen.getByText('Gamma')).toBeInTheDocument()

        fireEvent.change(screen.getByPlaceholderText('Search...'), {
            target: {
                value: 'gam'
            }
        })

        expect(screen.queryByText('Beta')).not.toBeInTheDocument()
        expect(screen.getByText('Gamma')).toBeInTheDocument()

        unmount()

        expect(ws.send).toHaveBeenCalledWith('Universal-Subscription', {
            mode: 'unsubscribe',
            scope: 'global',
            topic: 'Lobby-ListUpdated'
        })
    })
})
