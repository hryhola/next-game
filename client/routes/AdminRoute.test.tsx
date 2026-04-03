/** @jest-environment jsdom */

import type { ReactNode } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { AdminRoute } from './AdminRoute'

const postMock = jest.fn()
const refreshMock = jest.fn()
const confirmMock = jest.fn()
const openMock = jest.fn()

jest.mock('client/network-utils/api', () => ({
    api: {
        post: (...args: unknown[]) => postMock(...args)
    }
}))

jest.mock('next/navigation', () => ({
    useRouter: () => ({
        back: jest.fn(),
        forward: jest.fn(),
        prefetch: jest.fn(),
        push: jest.fn(),
        refresh: refreshMock,
        replace: jest.fn()
    })
}))

jest.mock('client/features/global-modal/GlobalModal', () => ({
    useGlobalModal: () => ({
        confirm: (...args: unknown[]) => confirmMock(...args),
        open: (...args: unknown[]) => openMock(...args)
    })
}))

describe('AdminRoute', () => {
    beforeEach(() => {
        jest.useFakeTimers().setSystemTime(new Date('2026-04-03T12:00:00.000Z'))
        postMock.mockReset()
        refreshMock.mockReset()
        confirmMock.mockReset()
        openMock.mockReset()
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    it('renders users and lobbies tables from the bootstrap data', () => {
        const pageView = render(
            <AdminRoute
                data={{
                    isAuthenticated: true,
                    lobbies: [
                        {
                            createdAt: '2026-04-02T10:00:00.000Z',
                            id: 'lobby-1',
                            membersCount: 2,
                            name: 'Lobby Alpha',
                            onlineUsers: 3,
                            updatedAt: '2026-04-03T10:00:00.000Z'
                        }
                    ],
                    users: [
                        {
                            id: 'user-1',
                            lastSeenAt: '2026-04-02T12:00:00.000Z',
                            name: 'Alice'
                        }
                    ]
                }}
            />
        )

        expect(screen.getByText('Users')).toBeInTheDocument()
        expect(screen.getByText('Lobbies')).toBeInTheDocument()
        expect(screen.getByText('Alice')).toBeInTheDocument()
        expect(screen.getByText('user-1')).toBeInTheDocument()
        expect(screen.getByText('Lobby Alpha')).toBeInTheDocument()
        expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('confirms and destroys a user through the admin endpoint', async () => {
        postMock.mockResolvedValueOnce([
            {
                success: true
            },
            undefined
        ])

        const pageView = render(
            <AdminRoute
                data={{
                    isAuthenticated: true,
                    lobbies: [],
                    users: [
                        {
                            id: 'user-1',
                            lastSeenAt: '2026-04-02T12:00:00.000Z',
                            name: 'Alice'
                        }
                    ]
                }}
            />
        )

        fireEvent.click(screen.getByRole('button', { name: 'Destroy user Alice' }))

        expect(confirmMock).toHaveBeenCalledTimes(1)

        const confirmOptions = confirmMock.mock.calls[0][0] as { onConfirm: () => void | Promise<void> }

        await act(async () => {
            await confirmOptions.onConfirm()
        })

        expect(postMock).toHaveBeenCalledWith('admin-user-destroy', {
            userId: 'user-1'
        })
        expect(screen.queryByText('Alice')).not.toBeInTheDocument()
        expect(refreshMock).toHaveBeenCalled()
    })

    it('confirms and destroys a lobby through the admin endpoint', async () => {
        postMock.mockResolvedValueOnce([
            {
                success: true
            },
            undefined
        ])

        const pageView = render(
            <AdminRoute
                data={{
                    isAuthenticated: true,
                    lobbies: [
                        {
                            createdAt: '2026-04-02T10:00:00.000Z',
                            id: 'lobby-1',
                            membersCount: 2,
                            name: 'Lobby Alpha',
                            onlineUsers: 3,
                            updatedAt: '2026-04-03T10:00:00.000Z'
                        }
                    ],
                    users: []
                }}
            />
        )

        fireEvent.click(screen.getByRole('button', { name: 'Destroy lobby Lobby Alpha' }))

        expect(confirmMock).toHaveBeenCalledTimes(1)

        const confirmOptions = confirmMock.mock.calls[0][0] as { onConfirm: () => void | Promise<void> }

        await act(async () => {
            await confirmOptions.onConfirm()
        })

        expect(postMock).toHaveBeenCalledWith('admin-lobby-destroy', {
            lobbyId: 'lobby-1'
        })
        expect(screen.queryByText('Lobby Alpha')).not.toBeInTheDocument()
        expect(refreshMock).toHaveBeenCalled()
    })

    it('shows only stale users in the destroy old confirmation and removes only those users', async () => {
        postMock.mockResolvedValueOnce([
            {
                success: true
            },
            undefined
        ])

        const pageView = render(
            <AdminRoute
                data={{
                    isAuthenticated: true,
                    lobbies: [],
                    users: [
                        {
                            id: 'user-1',
                            lastSeenAt: '2026-04-02T11:59:00.000Z',
                            name: 'Alice'
                        },
                        {
                            id: 'user-2',
                            lastSeenAt: '2026-04-03T02:00:00.000Z',
                            name: 'Bob'
                        },
                        {
                            id: 'user-3',
                            lastSeenAt: null,
                            name: 'Never Seen'
                        }
                    ]
                }}
            />
        )
        const pageQueries = within(pageView.container)

        fireEvent.click(pageQueries.getByRole('button', { name: 'Destroy old users' }))

        expect(confirmMock).toHaveBeenCalledTimes(1)

        const confirmOptions = confirmMock.mock.calls[0][0] as { content: ReactNode; onConfirm: () => void | Promise<void> }
        const contentView = render(<>{confirmOptions.content}</>)
        const contentQueries = within(contentView.container)

        expect(contentQueries.getByText(/Destroy 1 user inactive for more than 1 day/i)).toBeInTheDocument()
        expect(contentQueries.getByText(/Alice/)).toBeInTheDocument()
        expect(contentQueries.queryByText(/Bob/)).not.toBeInTheDocument()
        expect(contentQueries.queryByText(/Never Seen/)).not.toBeInTheDocument()

        await act(async () => {
            await confirmOptions.onConfirm()
        })

        expect(postMock).toHaveBeenCalledTimes(1)
        expect(postMock).toHaveBeenCalledWith('admin-user-destroy', {
            userId: 'user-1'
        })
        expect(pageQueries.queryByText('Alice')).not.toBeInTheDocument()
        expect(pageQueries.getByText('Bob')).toBeInTheDocument()
        expect(pageQueries.getByText('Never Seen')).toBeInTheDocument()
        expect(refreshMock).toHaveBeenCalledTimes(1)
    })

    it('shows only stale empty lobbies in the destroy old confirmation and removes only those lobbies', async () => {
        postMock.mockResolvedValueOnce([
            {
                success: true
            },
            undefined
        ])

        const pageView = render(
            <AdminRoute
                data={{
                    isAuthenticated: true,
                    lobbies: [
                        {
                            createdAt: '2026-03-31T10:00:00.000Z',
                            id: 'lobby-1',
                            membersCount: 0,
                            name: 'Old Empty',
                            onlineUsers: 0,
                            updatedAt: '2026-04-02T11:59:00.000Z'
                        },
                        {
                            createdAt: '2026-03-31T10:00:00.000Z',
                            id: 'lobby-2',
                            membersCount: 1,
                            name: 'Has Members',
                            onlineUsers: 0,
                            updatedAt: '2026-04-02T11:59:00.000Z'
                        },
                        {
                            createdAt: '2026-03-31T10:00:00.000Z',
                            id: 'lobby-3',
                            membersCount: 0,
                            name: 'Recent Empty',
                            onlineUsers: 0,
                            updatedAt: '2026-04-03T08:00:00.000Z'
                        }
                    ],
                    users: []
                }}
            />
        )
        const pageQueries = within(pageView.container)

        fireEvent.click(pageQueries.getByRole('button', { name: 'Destroy old lobbies' }))

        expect(confirmMock).toHaveBeenCalledTimes(1)

        const confirmOptions = confirmMock.mock.calls[0][0] as { content: ReactNode; onConfirm: () => void | Promise<void> }
        const contentView = render(<>{confirmOptions.content}</>)
        const contentQueries = within(contentView.container)

        expect(contentQueries.getByText(/Destroy 1 empty lobby inactive for more than 1 day/i)).toBeInTheDocument()
        expect(contentQueries.getByText(/Old Empty/)).toBeInTheDocument()
        expect(contentQueries.queryByText(/Has Members/)).not.toBeInTheDocument()
        expect(contentQueries.queryByText(/Recent Empty/)).not.toBeInTheDocument()

        await act(async () => {
            await confirmOptions.onConfirm()
        })

        expect(postMock).toHaveBeenCalledTimes(1)
        expect(postMock).toHaveBeenCalledWith('admin-lobby-destroy', {
            lobbyId: 'lobby-1'
        })
        expect(pageQueries.queryByText('Old Empty')).not.toBeInTheDocument()
        expect(pageQueries.getByText('Has Members')).toBeInTheDocument()
        expect(pageQueries.getByText('Recent Empty')).toBeInTheDocument()
        expect(refreshMock).toHaveBeenCalledTimes(1)
    })
})
