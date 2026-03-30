import { redirect } from 'next/navigation'
import { getRouteBootstrap } from 'client/server/realtime'

export default async function EntryPage() {
    const { activeLobby, user } = await getRouteBootstrap()

    if (!user) {
        redirect('/login')
    }

    if (activeLobby) {
        redirect(`/lobby/${encodeURIComponent(activeLobby.id)}`)
    }

    redirect('/home')
}
