'use client'

import { RouteProviders } from 'client/app/RouteProviders'
import { LoginFrame } from 'client/route/frames/LoginFrame'

export const LoginRoute: React.FC = () => {
    return (
        <RouteProviders>
            <LoginFrame />
        </RouteProviders>
    )
}
