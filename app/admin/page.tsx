import { RouteProviders } from 'client/app/RouteProviders'
import { AdminRoute } from 'client/routes/AdminRoute'
import { getAdminBootstrap } from 'client/server/realtime'

export default async function AdminPage() {
    return (
        <RouteProviders>
            <AdminRoute data={await getAdminBootstrap()} />
        </RouteProviders>
    )
}
