/** @jest-environment jsdom */

import { act, fireEvent, screen } from '@testing-library/react'
import { Chat } from './Chat'
import { createUserData, createWSHarness, renderWithProviders } from 'client/test-utils/renderWithProviders'

describe('Chat', () => {
    it('hydrates the global chat, appends live messages, sends new messages, and unsubscribes globally', () => {
        const ws = createWSHarness()
        const user = createUserData({
            id: 'user-1',
            userColor: '#00ff00',
            userNickname: 'Alice'
        })
        const { unmount } = renderWithProviders(<Chat scope="global" />, { user, ws })

        expect(ws.send).toHaveBeenCalledWith('Chat-Get', {
            lobbyId: undefined,
            scope: 'global'
        })
        expect(ws.send).toHaveBeenCalledWith('Universal-Subscription', {
            mode: 'subscribe',
            scope: 'global',
            topic: 'Chat-NewMessage'
        })

        act(() => {
            ws.emit('Chat-Get', {
                success: true,
                scope: 'global',
                messages: [
                    {
                        from: 'Bob',
                        id: 'm1',
                        text: 'Existing message'
                    }
                ]
            })
        })

        expect(screen.getByText('Existing message')).toBeInTheDocument()

        act(() => {
            ws.emit('Chat-NewMessage', {
                lobbyId: undefined,
                message: {
                    from: 'Carol',
                    id: 'm2',
                    text: 'Live message'
                },
                scope: 'global'
            })
        })

        expect(screen.getByText('Live message')).toBeInTheDocument()

        fireEvent.change(screen.getByPlaceholderText('Write a message...'), {
            target: {
                value: 'Hello everyone'
            }
        })
        fireEvent.click(screen.getByRole('button'))

        expect(ws.send).toHaveBeenCalledWith(
            'Chat-Send',
            expect.objectContaining({
                scope: 'global',
                message: expect.objectContaining({
                    from: 'Alice',
                    fromColor: '#00ff00',
                    text: 'Hello everyone'
                })
            })
        )

        unmount()

        expect(ws.send).toHaveBeenCalledWith('Universal-Subscription', {
            mode: 'unsubscribe',
            scope: 'global',
            topic: 'Chat-NewMessage'
        })
    })

    it('hydrates lobby chat without subscribing to the global chat stream', () => {
        const ws = createWSHarness()

        renderWithProviders(<Chat scope="lobby" lobbyId="lobby-1" />, { ws })

        expect(ws.send).toHaveBeenCalledWith('Chat-Get', {
            lobbyId: 'lobby-1',
            scope: 'lobby'
        })
        expect(ws.send).not.toHaveBeenCalledWith(
            'Universal-Subscription',
            expect.objectContaining({
                topic: 'Chat-NewMessage'
            })
        )

        act(() => {
            ws.emit('Chat-Get', {
                lobbyId: 'lobby-1',
                messages: [
                    {
                        from: 'Lobby user',
                        id: 'l1',
                        text: 'Lobby hello'
                    }
                ],
                scope: 'lobby',
                success: true
            })
            ws.emit('Chat-NewMessage', {
                lobbyId: 'lobby-1',
                message: {
                    from: 'Lobby user',
                    id: 'l2',
                    text: 'Lobby update'
                },
                scope: 'lobby'
            })
            ws.emit('Chat-NewMessage', {
                lobbyId: undefined,
                message: {
                    from: 'Global user',
                    id: 'g1',
                    text: 'Global update'
                },
                scope: 'global'
            })
        })

        expect(screen.getByText('Lobby hello')).toBeInTheDocument()
        expect(screen.getByText('Lobby update')).toBeInTheDocument()
        expect(screen.queryByText('Global update')).not.toBeInTheDocument()
    })
})
