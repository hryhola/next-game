'use client'

import dynamic from 'next/dynamic'
import { RouteProviders } from 'client/app/RouteProviders'
import type { UserData } from 'shared/contracts/app'

type Props = {
    user: UserData
}

const CreatePackEditor = dynamic(() => import('client/features/create-pack/CreatePackEditor').then(module => module.CreatePackEditor), {
    ssr: false,
    loading: () => (
        <div className="h-[var(--fullHeight)] overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.16),transparent_40%),linear-gradient(180deg,#0b1024,#050816)] px-6">
            <div className="flex min-h-full items-center justify-center py-6">
                <div className="glass-card max-w-xl rounded-[2rem] px-8 py-10 text-center">
                    <p className="text-xs uppercase tracking-[0.35em] text-violet-200/55">Pack Studio</p>
                    <h1 className="mt-3 text-2xl font-semibold text-white">Loading Create Pack</h1>
                    <p className="mt-3 text-sm leading-6 text-slate-300">Preparing the browser-only SIQ pack editor.</p>
                </div>
            </div>
        </div>
    )
})

export const CreatePackRoute: React.FC<Props> = ({ user }) => {
    return (
        <RouteProviders user={user}>
            <CreatePackEditor />
        </RouteProviders>
    )
}
