import { redirect } from 'next/navigation'
import { HomeRoute } from 'client/routes/HomeRoute'
import { getRouteBootstrap } from 'client/server/realtime'

export default async function HomePage() {
    const { activeLobby, user } = await getRouteBootstrap()

    if (!user) {
        redirect('/login')
    }

    if (activeLobby) {
        redirect(`/lobby/${encodeURIComponent(activeLobby.id)}`)
    }

    return <HomeRoute user={user} />
}
