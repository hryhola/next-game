type Props = {
    state: string
}

export const AdminRoute: React.FC<Props> = ({ state }) => {
    return (
        <div className="mx-auto flex h-[var(--fullHeight)] max-w-6xl flex-col overflow-hidden px-6 py-10">
            <div className="glass-card flex min-h-0 flex-1 flex-col overflow-hidden p-6">
                <pre className="min-h-0 flex-1 overflow-auto rounded-3xl bg-slate-950/60 p-4 text-xs text-slate-100">{state}</pre>
            </div>
        </div>
    )
}
