import { LoaderCircle } from 'lucide-react'

export default function Loading() {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/72 backdrop-blur-sm">
            <div className="glass-card flex items-center gap-3 px-5 py-4 text-sm text-slate-100">
                <LoaderCircle className="size-5 animate-spin text-violet-200" />
                <span>Loading...</span>
            </div>
        </div>
    )
}
