import { useContext } from 'react'
import { Header } from 'client/features/header/Header'
import { HomeContext } from 'client/context/list/homeCtx'

import { HomeTabs } from 'client/features/home-tabs/HomeTabs'
import { Navigation } from 'client/features/navigation/Navigation'
import { ProfileEditor } from 'client/features/profile-editor/ProfileEditor'
import { FullScreenModal } from 'client/ui/full-screen-modal/FullScreenModal'
import { LobbyCreator } from 'client/features/lobby-creator/LobbyCreator'

export const HomeFrame: React.FC = () => {
    const home = useContext(HomeContext)

    return (
        <>
            <div className="flex h-[var(--fullHeight)] flex-col overflow-hidden">
                <Header />
                <div className="min-h-0 flex-1 overflow-hidden">
                    <HomeTabs className="flex-1" />
                </div>
            </div>
            <FullScreenModal label="Edit profile" transition="left" padding isOpen={home.isProfileEditOpen} setIsOpen={home.setIsProfileEditOpen}>
                <ProfileEditor onUpdated={() => home.setIsProfileEditOpen(false)} />
            </FullScreenModal>
            <FullScreenModal label="Navigation" isOpen={home.isNavigationOpen} setIsOpen={home.setIsNavigationOpen} transition="right">
                <Navigation />
            </FullScreenModal>
            <FullScreenModal label="Create lobby" transition="up" padding isOpen={home.isCreateLobbyOpen} setIsOpen={home.setIsCreateLobbyOpen}>
                <LobbyCreator />
            </FullScreenModal>
        </>
    )
}
