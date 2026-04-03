'use client'

import React from 'react'
import { api } from 'client/network-utils/api'
import { useGlobalModal } from 'client/features/global-modal/GlobalModal'
import { Button } from 'client/ui/primitives'
import { useRouter } from 'next/navigation'
import type { AdminLobbyListItem, AdminUserListItem } from 'shared/contracts/http-api'

type Props = {
    data: {
        isAuthenticated: boolean
        lobbies: AdminLobbyListItem[]
        users: AdminUserListItem[]
    }
}

function formatTimestamp(value: string | null): string {
    if (!value) {
        return 'Never'
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return value
    }

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(date)
}

function getFailureMessage(response: unknown): string | null {
    if (!response || typeof response !== 'object' || !('message' in response)) {
        return null
    }

    const { message } = response as { message?: unknown }

    return typeof message === 'string' ? message : null
}

function getErrorMessage(error: unknown): string | null {
    if (!(error instanceof Error)) {
        return null
    }

    return error.message
}

type DataTableProps = {
    actions?: React.ReactNode
    children: React.ReactNode
    description: string
    title: string
}

const DataTableCard: React.FC<DataTableProps> = ({ actions, children, description, title }) => {
    return (
        <section className="glass-card flex min-h-0 flex-1 flex-col overflow-hidden p-6">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-white">{title}</h2>
                    <p className="text-sm text-slate-300">{description}</p>
                </div>
                {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
            </div>
            <div className="min-h-0 flex-1 overflow-auto rounded-3xl border border-white/10 bg-slate-950/35">{children}</div>
        </section>
    )
}

const tableCellClassName = 'px-4 py-3 text-left align-middle text-sm text-slate-100'
const tableHeadClassName = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400'
const oneDayMs = 24 * 60 * 60 * 1000

function parseTimestamp(value: string | null): number | null {
    if (!value) {
        return null
    }

    const parsed = Date.parse(value)

    return Number.isNaN(parsed) ? null : parsed
}

function isOlderThanOneDay(value: string | null, nowMs: number): boolean {
    const parsed = parseTimestamp(value)

    return parsed !== null && nowMs - parsed >= oneDayMs
}

function renderDestroyList(title: string, items: React.ReactNode[]) {
    return (
        <div className="space-y-3">
            <p className="text-sm text-slate-200">{title}</p>
            <ul className="max-h-64 space-y-2 overflow-auto rounded-2xl border border-white/10 bg-slate-950/40 p-3 text-sm text-slate-100">
                {items.map((item, index) => (
                    <li className="leading-6" key={index}>
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    )
}

export const AdminRoute: React.FC<Props> = ({ data }) => {
    const globalModal = useGlobalModal()
    const router = useRouter()
    const [users, setUsers] = React.useState(data.users)
    const [lobbies, setLobbies] = React.useState(data.lobbies)
    const [pendingActionId, setPendingActionId] = React.useState<string | null>(null)
    const [nowMs] = React.useState(() => Date.now())
    const oldUsers = React.useMemo(() => users.filter(user => isOlderThanOneDay(user.lastSeenAt, nowMs)), [nowMs, users])
    const oldLobbies = React.useMemo(() => lobbies.filter(lobby => lobby.membersCount === 0 && isOlderThanOneDay(lobby.updatedAt, nowMs)), [lobbies, nowMs])

    React.useEffect(() => {
        setUsers(data.users)
        setLobbies(data.lobbies)
    }, [data.lobbies, data.users])

    const showError = React.useCallback(
        (message: string) => {
            globalModal.open({
                title: 'Request failed',
                content: message
            })
        },
        [globalModal]
    )

    const showBulkFailure = React.useCallback(
        (title: string, failures: Array<{ label: string; message: string }>) => {
            globalModal.open({
                title,
                content: renderDestroyList(
                    `${failures.length} item${failures.length === 1 ? '' : 's'} could not be destroyed.`,
                    failures.map(failure => (
                        <span key={failure.label}>
                            <span className="font-medium text-white">{failure.label}</span>
                            <span className="text-slate-300">{`: ${failure.message}`}</span>
                        </span>
                    ))
                )
            })
        },
        [globalModal]
    )

    const destroyUsersBatch = React.useCallback(
        async (candidates: AdminUserListItem[]) => {
            if (!candidates.length) {
                return
            }

            const actionId = 'users:bulk-old'

            setPendingActionId(actionId)

            const results = await Promise.all(
                candidates.map(async user => {
                    const [response, error] = await api.post('admin-user-destroy', {
                        userId: user.id
                    })

                    if (error || !response?.success) {
                        return {
                            item: user,
                            ok: false as const,
                            message: getErrorMessage(error) || getFailureMessage(response) || `Failed to destroy ${user.name}`
                        }
                    }

                    return {
                        item: user,
                        ok: true as const
                    }
                })
            )

            setPendingActionId(current => (current === actionId ? null : current))

            const successes = results.flatMap(result => (result.ok ? [result.item] : []))
            const failures = results.flatMap(result =>
                result.ok
                    ? []
                    : [
                          {
                              item: result.item,
                              message: result.message
                          }
                      ]
            )

            if (successes.length) {
                const destroyedIds = new Set(successes.map(user => user.id))
                setUsers(current => current.filter(user => !destroyedIds.has(user.id)))
                router.refresh()
            }

            if (failures.length) {
                showBulkFailure(
                    'Destroy old users failed',
                    failures.map(failure => ({
                        label: failure.item.name,
                        message: failure.message
                    }))
                )
            }
        },
        [router, showBulkFailure]
    )

    const destroyLobbiesBatch = React.useCallback(
        async (candidates: AdminLobbyListItem[]) => {
            if (!candidates.length) {
                return
            }

            const actionId = 'lobbies:bulk-old'

            setPendingActionId(actionId)

            const results = await Promise.all(
                candidates.map(async lobby => {
                    const [response, error] = await api.post('admin-lobby-destroy', {
                        lobbyId: lobby.id
                    })

                    if (error || !response?.success) {
                        return {
                            item: lobby,
                            ok: false as const,
                            message: getErrorMessage(error) || getFailureMessage(response) || `Failed to destroy ${lobby.name}`
                        }
                    }

                    return {
                        item: lobby,
                        ok: true as const
                    }
                })
            )

            setPendingActionId(current => (current === actionId ? null : current))

            const successes = results.flatMap(result => (result.ok ? [result.item] : []))
            const failures = results.flatMap(result =>
                result.ok
                    ? []
                    : [
                          {
                              item: result.item,
                              message: result.message
                          }
                      ]
            )

            if (successes.length) {
                const destroyedIds = new Set(successes.map(lobby => lobby.id))
                setLobbies(current => current.filter(lobby => !destroyedIds.has(lobby.id)))
                router.refresh()
            }

            if (failures.length) {
                showBulkFailure(
                    'Destroy old lobbies failed',
                    failures.map(failure => ({
                        label: failure.item.name,
                        message: failure.message
                    }))
                )
            }
        },
        [router, showBulkFailure]
    )

    const destroyUser = React.useCallback(
        async (user: AdminUserListItem) => {
            const actionId = `user:${user.id}`

            setPendingActionId(actionId)

            const [response, error] = await api.post('admin-user-destroy', {
                userId: user.id
            })

            setPendingActionId(current => (current === actionId ? null : current))

            if (error || !response?.success) {
                showError(getErrorMessage(error) || getFailureMessage(response) || `Failed to destroy ${user.name}`)
                return
            }

            setUsers(current => current.filter(item => item.id !== user.id))
            router.refresh()
        },
        [router, showError]
    )

    const destroyLobby = React.useCallback(
        async (lobby: AdminLobbyListItem) => {
            const actionId = `lobby:${lobby.id}`

            setPendingActionId(actionId)

            const [response, error] = await api.post('admin-lobby-destroy', {
                lobbyId: lobby.id
            })

            setPendingActionId(current => (current === actionId ? null : current))

            if (error || !response?.success) {
                showError(getErrorMessage(error) || getFailureMessage(response) || `Failed to destroy ${lobby.name}`)
                return
            }

            setLobbies(current => current.filter(item => item.id !== lobby.id))
            router.refresh()
        },
        [router, showError]
    )

    const confirmDestroyUser = React.useCallback(
        (user: AdminUserListItem) => {
            globalModal.confirm({
                title: 'Destroy user',
                content: `Destroy ${user.name}? This removes the profile, closes active sessions, and removes the user from any active lobby.`,
                onConfirm: () => destroyUser(user)
            })
        },
        [destroyUser, globalModal]
    )

    const confirmDestroyLobby = React.useCallback(
        (lobby: AdminLobbyListItem) => {
            globalModal.confirm({
                title: 'Destroy lobby',
                content: `Destroy ${lobby.name}? All members will be disconnected.`,
                onConfirm: () => destroyLobby(lobby)
            })
        },
        [destroyLobby, globalModal]
    )

    const confirmDestroyOldUsers = React.useCallback(() => {
        if (!oldUsers.length) {
            return
        }

        globalModal.confirm({
            title: 'Destroy old users',
            content: renderDestroyList(
                `Destroy ${oldUsers.length} user${oldUsers.length === 1 ? '' : 's'} inactive for more than 1 day?`,
                oldUsers.map(user => (
                    <span key={user.id}>
                        <span className="font-medium text-white">{user.name}</span>
                        <span className="text-slate-300">{` — last seen ${formatTimestamp(user.lastSeenAt)}`}</span>
                    </span>
                ))
            ),
            onConfirm: () => destroyUsersBatch(oldUsers)
        })
    }, [destroyUsersBatch, globalModal, oldUsers])

    const confirmDestroyOldLobbies = React.useCallback(() => {
        if (!oldLobbies.length) {
            return
        }

        globalModal.confirm({
            title: 'Destroy old lobbies',
            content: renderDestroyList(
                `Destroy ${oldLobbies.length} empty lobb${oldLobbies.length === 1 ? 'y' : 'ies'} inactive for more than 1 day?`,
                oldLobbies.map(lobby => (
                    <span key={lobby.id}>
                        <span className="font-medium text-white">{lobby.name}</span>
                        <span className="text-slate-300">{` — last active ${formatTimestamp(lobby.updatedAt)}`}</span>
                    </span>
                ))
            ),
            onConfirm: () => destroyLobbiesBatch(oldLobbies)
        })
    }, [destroyLobbiesBatch, globalModal, oldLobbies])

    if (!data.isAuthenticated) {
        return (
            <div className="mx-auto flex h-[var(--fullHeight)] max-w-6xl flex-col overflow-hidden px-6 py-10">
                <div className="glass-card flex min-h-0 flex-1 items-center justify-center p-6 text-center text-slate-200">Admin access is unavailable.</div>
            </div>
        )
    }

    return (
        <div className="mx-auto flex h-[var(--fullHeight)] max-w-7xl flex-col gap-6 overflow-hidden px-6 py-10">
            <DataTableCard
                actions={
                    <Button
                        aria-label="Destroy old users"
                        disabled={!oldUsers.length || pendingActionId !== null}
                        onClick={confirmDestroyOldUsers}
                        size="sm"
                        variant="outlineDanger"
                    >
                        {pendingActionId === 'users:bulk-old' ? 'Destroying...' : `Destroy Old (${oldUsers.length})`}
                    </Button>
                }
                description="Registered profiles and their most recent activity."
                title="Users"
            >
                <table className="min-w-full border-collapse">
                    <thead className="sticky top-0 bg-slate-950/95 backdrop-blur">
                        <tr className="border-b border-white/10">
                            <th className={tableHeadClassName}>Name</th>
                            <th className={tableHeadClassName}>Id</th>
                            <th className={tableHeadClassName}>Last Seen</th>
                            <th className={tableHeadClassName}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length ? (
                            users.map(user => {
                                const actionId = `user:${user.id}`

                                return (
                                    <tr className="border-b border-white/5 last:border-b-0" key={user.id}>
                                        <td className={tableCellClassName}>{user.name}</td>
                                        <td className={`${tableCellClassName} font-mono text-xs text-slate-300`}>{user.id}</td>
                                        <td className={tableCellClassName}>{formatTimestamp(user.lastSeenAt)}</td>
                                        <td className={tableCellClassName}>
                                            <Button
                                                aria-label={`Destroy user ${user.name}`}
                                                disabled={pendingActionId !== null}
                                                onClick={() => confirmDestroyUser(user)}
                                                size="sm"
                                                variant="outlineDanger"
                                            >
                                                {pendingActionId === actionId ? 'Destroying...' : 'Destroy'}
                                            </Button>
                                        </td>
                                    </tr>
                                )
                            })
                        ) : (
                            <tr>
                                <td className="px-4 py-6 text-sm text-slate-400" colSpan={4}>
                                    No users found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </DataTableCard>

            <DataTableCard
                actions={
                    <Button
                        aria-label="Destroy old lobbies"
                        disabled={!oldLobbies.length || pendingActionId !== null}
                        onClick={confirmDestroyOldLobbies}
                        size="sm"
                        variant="outlineDanger"
                    >
                        {pendingActionId === 'lobbies:bulk-old' ? 'Destroying...' : `Destroy Old (${oldLobbies.length})`}
                    </Button>
                }
                description="Active lobbies and the amount of currently connected users."
                title="Lobbies"
            >
                <table className="min-w-full border-collapse">
                    <thead className="sticky top-0 bg-slate-950/95 backdrop-blur">
                        <tr className="border-b border-white/10">
                            <th className={tableHeadClassName}>Name</th>
                            <th className={tableHeadClassName}>Online Users</th>
                            <th className={tableHeadClassName}>Created</th>
                            <th className={tableHeadClassName}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lobbies.length ? (
                            lobbies.map(lobby => {
                                const actionId = `lobby:${lobby.id}`

                                return (
                                    <tr className="border-b border-white/5 last:border-b-0" key={lobby.id}>
                                        <td className={tableCellClassName}>{lobby.name}</td>
                                        <td className={tableCellClassName}>{lobby.onlineUsers}</td>
                                        <td className={tableCellClassName}>{formatTimestamp(lobby.createdAt)}</td>
                                        <td className={tableCellClassName}>
                                            <Button
                                                aria-label={`Destroy lobby ${lobby.name}`}
                                                disabled={pendingActionId !== null}
                                                onClick={() => confirmDestroyLobby(lobby)}
                                                size="sm"
                                                variant="outlineDanger"
                                            >
                                                {pendingActionId === actionId ? 'Destroying...' : 'Destroy'}
                                            </Button>
                                        </td>
                                    </tr>
                                )
                            })
                        ) : (
                            <tr>
                                <td className="px-4 py-6 text-sm text-slate-400" colSpan={4}>
                                    No lobbies found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </DataTableCard>
        </div>
    )
}
