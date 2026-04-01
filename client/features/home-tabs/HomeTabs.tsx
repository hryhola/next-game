import * as React from 'react'
import { LobbyBrowser } from '../lobby-browser/LobbyBrowser'
import { Chat } from '../chat/Chat'
import { GlobalUsersList } from '../global-users-list/GlobalUsersList'
import { GlobalUsersListTitle } from '../global-users-list/GlobalUsersListTitle'
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'client/ui/primitives'
import { cn } from 'client/ui/lib/cn'
import { GlobalOnlineUser } from '../global-users-list/useGlobalOnlineUsers'

type HomeTabsProps = {
    className?: string
    onlineCount: number | null
    onlineUsers: GlobalOnlineUser[]
}

export const HomeTabs: React.FC<HomeTabsProps> = props => {
    return (
        <Tabs defaultValue="lobbies" className={cn('flex h-full min-h-0 flex-col gap-4 overflow-visible px-4 py-4 sm:px-6', props.className)}>
            <TabsList className="grid h-12 w-full grid-cols-3">
                <TabsTrigger value="lobbies">Lobbies</TabsTrigger>
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="online">
                    <GlobalUsersListTitle count={props.onlineCount} />
                </TabsTrigger>
            </TabsList>
            <TabsContent className="mt-0 min-h-0 flex-1 overflow-visible" value="lobbies">
                <div className="h-full min-h-0">
                    <LobbyBrowser />
                </div>
            </TabsContent>
            <TabsContent className="mt-0 min-h-0 flex-1 overflow-visible" value="chat">
                <div className="h-full min-h-0">
                    <Chat className="h-full" scope="global" />
                </div>
            </TabsContent>
            <TabsContent className="mt-0 min-h-0 flex-1 overflow-visible" value="online">
                <div className="h-full min-h-0">
                    <GlobalUsersList users={props.onlineUsers} />
                </div>
            </TabsContent>
        </Tabs>
    )
}
