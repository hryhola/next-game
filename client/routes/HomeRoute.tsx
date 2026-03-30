'use client'

import { RouteProviders } from 'client/app/RouteProviders'
import { HomeFrame } from 'client/route/frames/HomeFrame'
import type { UserData } from 'shared/contracts/app'

type Props = {
    user: UserData
}

export const HomeRoute: React.FC<Props> = ({ user }) => {
    return (
        <RouteProviders user={user}>
            <HomeFrame />
        </RouteProviders>
    )
}
