import { useContext } from 'react'
import { Header } from 'client/features/header/Header'
import { HomeContext } from 'client/context/list/home'

import { HomeTabs } from 'client/features/home-tabs/HomeTabs'
import { Navigation } from 'client/features/navigation/Navigation'
import { Grid } from '@mui/material'
import { ProfileEditor } from 'client/features/profile-editor/ProfileEditor'
import FullScreenModal from 'client/ui/full-screen-modal/FullScreenModal'
import { LobbyCreator } from 'client/features/lobby-creator/LobbyCreator'

export const HomeRoute: React.FC = () => {
    const home = useContext(HomeContext)

    return (
        <>
            <Grid display="flex" direction="column" height="100vh" container>
                <Grid item>
                    <Header />
                </Grid>
                <Grid item>
                    <HomeTabs sx={{ flexGrow: 1 }} />
                </Grid>
            </Grid>
            <FullScreenModal label="Edit profile" isOpen={home.isProfileEditOpen} setIsOpen={home.setIsProfileEditOpen}>
                <ProfileEditor />
            </FullScreenModal>
            <FullScreenModal label="Navigation" isOpen={home.isNavigationOpen} setIsOpen={home.setIsNavigationOpen} transition="right">
                <Navigation />
            </FullScreenModal>
            <FullScreenModal label="Create lobby" isOpen={home.isCreateLobbyOpen} setIsOpen={home.setIsCreateLobbyOpen} transition="right">
                <LobbyCreator />
            </FullScreenModal>
        </>
    )
}
