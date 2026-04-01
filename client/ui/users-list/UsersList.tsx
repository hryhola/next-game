import React, { useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from 'client/ui/primitives'
import { useI18n } from 'client/context/list'

interface Props {
    users: Array<{ userNickname: string; id: string }>
}

export const UsersListBox: React.FC<Props> = props => {
    const [searchString, setSearchString] = useState('')
    const { t } = useI18n()

    const renderedUsers = searchString.length ? props.users.filter(u => u.userNickname.toLowerCase().includes(searchString.toLowerCase())) : props.users

    return (
        <div className="flex h-full flex-col gap-4">
            <div className="relative">
                <Search className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input placeholder={t('common.search')} value={searchString} onChange={e => setSearchString(e.target.value)} className="pr-10" />
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                {renderedUsers.map(user => (
                    <div key={user.id} className="px-1 y-3 text-sm text-slate-100">
                        {user.userNickname}
                    </div>
                ))}
            </div>
        </div>
    )
}
