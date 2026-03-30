import { useUser } from 'client/context/list'
import { Button } from 'client/ui/primitives'
import { UserRound } from 'lucide-react'
import { cn } from 'client/ui/lib/cn'

function ProfilePicture() {
    const user = useUser()

    if (user.userAvatarUrl) {
        return (
            <>
                <img className="size-10 rounded-full border border-white/10 object-cover" src={user.userAvatarUrl} alt="profile avatar" />
            </>
        )
    }

    return <UserRound className="size-10" style={{ color: user.userColor }} />
}

export const ProfilePreview: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = props => {
    const user = useUser()

    return (
        <Button variant="ghost" className={cn('h-auto gap-3 rounded-full px-3 py-2 text-left', props.className)} {...props}>
            <span className="text-sm font-semibold" style={{ color: user.userColor }}>
                {user.userNickname}
            </span>
            <ProfilePicture />
        </Button>
    )
}
