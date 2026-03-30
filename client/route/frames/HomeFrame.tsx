import { useContext } from 'react'
import { Header } from 'client/features/header/Header'
import { HomeContext } from 'client/context/list/homeCtx'
import { HomeTabs } from 'client/features/home-tabs/HomeTabs'
import { ProfileEditor } from 'client/features/profile-editor/ProfileEditor'
import { FullScreenModal } from 'client/ui/full-screen-modal/FullScreenModal'
import { LobbyCreator } from 'client/features/lobby-creator/LobbyCreator'
import { ProfilePreview } from 'client/features/header/ProfilePreview'
import { LobbyBrowser } from 'client/features/lobby-browser/LobbyBrowser'
import { GlobalUsersList } from 'client/features/global-users-list/GlobalUsersList'
import { GlobalUsersListTitle } from 'client/features/global-users-list/GlobalUsersListTitle'
import { Chat } from 'client/features/chat/Chat'
import { Button, Card, CardContent, CardHeader } from 'client/ui/primitives'

const DesktopWidget: React.FC<{
    title: React.ReactNode
    action?: React.ReactNode
    children: React.ReactNode
    className?: string
    style?: React.CSSProperties
}> = ({ title, action, children, className, style }) => {
    return (
        <Card className={className} style={style}>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
                <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-white">{title}</h2>
                </div>
                {action}
            </CardHeader>
            <CardContent className="min-h-0 flex-1 pt-0">{children}</CardContent>
        </Card>
    )
}

export const HomeFrame: React.FC = () => {
    const home = useContext(HomeContext)

    return (
        <>
            <div className="flex h-[var(--fullHeight)] flex-col overflow-hidden lg:hidden">
                <Header className="shrink-0" />
                <div className="min-h-0 flex-1 overflow-hidden">
                    <HomeTabs className="flex-1" />
                </div>
            </div>
            <div className="hidden h-[var(--fullHeight)] grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)] gap-6 overflow-hidden p-6 lg:grid">
                <div className="min-h-0 flex flex-col gap-6 overflow-hidden">
                    <div className="px-2">
                        <p className="text-xs uppercase tracking-[0.35em] text-violet-200/55">Game Club</p>
                    </div>
                    <DesktopWidget
                        title="Lobbies"
                        action={
                            <Button variant="secondary" onClick={() => home.setIsCreateLobbyOpen(true)}>
                                Create lobby
                            </Button>
                        }
                        className="flex min-h-0 flex-1 flex-col overflow-hidden"
                    >
                        <div className="h-full min-h-0">
                            <LobbyBrowser />
                        </div>
                    </DesktopWidget>
                </div>
                <div className="min-h-0 flex flex-col gap-6 overflow-hidden">
                    <div className="flex justify-end">
                        <ProfilePreview className="glass-panel border border-white/10 px-4 py-3" onClick={() => home.setIsProfileEditOpen(true)} />
                    </div>
                    <DesktopWidget
                        title={<GlobalUsersListTitle />}
                        className="flex min-h-0 h-[min(34vh,22rem)] flex-col overflow-hidden shadow-none"
                        style={{ boxShadow: 'none' }}
                    >
                        <div className="h-full min-h-0">
                            <GlobalUsersList />
                        </div>
                    </DesktopWidget>
                    <DesktopWidget title="Global Chat" className="flex min-h-0 flex-1 flex-col overflow-hidden shadow-none" style={{ boxShadow: 'none' }}>
                        <div className="h-full min-h-0">
                            <Chat className="h-full" scope="global" />
                        </div>
                    </DesktopWidget>
                </div>
            </div>
            <FullScreenModal label="Edit profile" transition="left" padding isOpen={home.isProfileEditOpen} setIsOpen={home.setIsProfileEditOpen}>
                <ProfileEditor onUpdated={() => home.setIsProfileEditOpen(false)} />
            </FullScreenModal>
            <FullScreenModal label="Create lobby" transition="up" padding isOpen={home.isCreateLobbyOpen} setIsOpen={home.setIsCreateLobbyOpen}>
                <LobbyCreator />
            </FullScreenModal>
        </>
    )
}
