/** @jest-environment jsdom */

import { act, screen } from '@testing-library/react'
import { GlobalUsersList } from './GlobalUsersList'
import { useGlobalOnlineUsers } from './useGlobalOnlineUsers'
import { createWSHarness, renderWithProviders } from 'client/test-utils/renderWithProviders'

const OnlineUsersProbe = () => {
    const { count, users } = useGlobalOnlineUsers()

    return (
        <>
            <div>{count === null ? 'loading' : `count:${count}`}</div>
            <GlobalUsersList users={users} />
        </>
    )
}

describe('useGlobalOnlineUsers', () => {
    it('hydrates from the worker snapshot, reacts to presence updates, and unsubscribes on unmount', () => {
        const ws = createWSHarness()
        const { unmount } = renderWithProviders(<OnlineUsersProbe />, { ws })

        expect(ws.send).toHaveBeenCalledWith('Universal-Subscription', {
            mode: 'subscribe',
            scope: 'global',
            topic: 'UserRegistry-OnlineUpdate'
        })
        expect(ws.send).toHaveBeenCalledWith('Users-Get', {
            scope: 'global'
        })
        expect(screen.getByText('loading')).toBeInTheDocument()

        act(() => {
            ws.emit('Users-Get', {
                data: [
                    { id: 'user-1', userNickname: 'Alice' },
                    { id: 'user-2', userNickname: 'Bob' }
                ]
            })
        })

        expect(screen.getByText('count:2')).toBeInTheDocument()
        expect(screen.getByText('Alice')).toBeInTheDocument()
        expect(screen.getByText('Bob')).toBeInTheDocument()

        act(() => {
            ws.emit('UserRegistry-OnlineUpdate', {
                list: [{ id: 'user-3', userNickname: 'Carol' }]
            })
        })

        expect(screen.getByText('count:1')).toBeInTheDocument()
        expect(screen.queryByText('Alice')).not.toBeInTheDocument()
        expect(screen.getByText('Carol')).toBeInTheDocument()

        unmount()

        expect(ws.send).toHaveBeenCalledWith('Universal-Subscription', {
            mode: 'unsubscribe',
            scope: 'global',
            topic: 'UserRegistry-OnlineUpdate'
        })
    })
})
