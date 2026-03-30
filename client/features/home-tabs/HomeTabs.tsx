import * as React from 'react'
import { LobbyBrowser } from '../lobby-browser/LobbyBrowser'
import { Chat } from '../chat/Chat'
import { headerHeight } from '../header/Header'
import { GlobalUsersList } from '../global-users-list/GlobalUsersList'
import { GlobalUsersListTitle } from '../global-users-list/GlobalUsersListTitle'
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'client/ui/primitives'
import { cn } from 'client/ui/lib/cn'

export const tabsHeaderHeight = '48px'

type HomeTabsProps = {
    className?: string
}

export const HomeTabs: React.FC<HomeTabsProps> = props => {
    const contentHeight = `calc(var(--fullHeight) - ${tabsHeaderHeight} - ${headerHeight} - 32px)`

    return (
        <Tabs defaultValue="lobbies" className={cn('flex h-full flex-col gap-4 px-4 py-4 sm:px-6', props.className)}>
            <TabsList className="grid h-12 w-full grid-cols-3">
                <TabsTrigger value="lobbies">Lobbies</TabsTrigger>
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="online">
                    <GlobalUsersListTitle />
                </TabsTrigger>
            </TabsList>
            <TabsContent className="mt-0 min-h-0 flex-1" value="lobbies">
                <div style={{ height: contentHeight }}>
                    <LobbyBrowser />
                </div>
            </TabsContent>
            <TabsContent className="mt-0 min-h-0 flex-1" value="chat">
                <div style={{ height: contentHeight }}>
                    <Chat className="h-full" scope="global" />
                </div>
            </TabsContent>
            <TabsContent className="mt-0 min-h-0 flex-1" value="online">
                <div style={{ height: contentHeight }}>
                    <GlobalUsersList />
                </div>
            </TabsContent>
        </Tabs>
    )
}
