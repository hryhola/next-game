type Props = {
    state: string
}

export const AdminRoute: React.FC<Props> = ({ state }) => {
    return (
        <div className="mx-auto min-h-screen max-w-6xl px-6 py-10">
            <div className="glass-card overflow-hidden p-6">
                <pre className="overflow-auto rounded-3xl bg-slate-950/60 p-4 text-xs text-slate-100">{state}</pre>
            </div>
        </div>
    )
}
