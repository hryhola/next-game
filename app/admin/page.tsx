import { AdminRoute } from 'client/routes/AdminRoute'
import { getAdminBootstrap } from 'client/server/realtime'

export default async function AdminPage() {
    return <AdminRoute state={JSON.stringify(await getAdminBootstrap(), null, 4)} />
}
