import { redirect } from 'next/navigation'
import { CreatePackRoute } from 'client/routes/CreatePackRoute'
import { getRouteBootstrap } from 'client/server/realtime'

export default async function CreatePackPage() {
    const { user } = await getRouteBootstrap()

    if (!user) {
        redirect('/login')
    }

    return <CreatePackRoute user={user} />
}
