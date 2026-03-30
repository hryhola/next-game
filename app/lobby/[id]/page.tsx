import { notFound, redirect } from 'next/navigation'
import { LobbyRoute } from 'client/routes/LobbyRoute'
import { getLobbyBootstrap } from 'client/server/realtime'

type Props = {
    params: Promise<{
        id: string
    }>
}

function normalizeLobbyIdRouteParam(id: string) {
    try {
        return decodeURIComponent(id)
    } catch (_error) {
        return id
    }
}

export default async function LobbyPage({ params }: Props) {
    const { id } = await params
    const lobbyId = normalizeLobbyIdRouteParam(id)
    const { user, lobby, isMember } = await getLobbyBootstrap(lobbyId)

    if (!user) {
        redirect('/login')
    }

    if (!lobby) {
        notFound()
    }

    return <LobbyRoute user={user} lobby={lobby} isMember={isMember} />
}
