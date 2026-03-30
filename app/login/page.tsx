import { redirect } from 'next/navigation'
import { LoginRoute } from 'client/routes/LoginRoute'
import { getRouteBootstrap } from 'client/server/realtime'

export default async function LoginPage() {
    const { activeLobby, user } = await getRouteBootstrap()

    if (user && activeLobby) {
        redirect(`/lobby/${encodeURIComponent(activeLobby.id)}`)
    }

    if (user) {
        redirect('/home')
    }

    return <LoginRoute />
}
