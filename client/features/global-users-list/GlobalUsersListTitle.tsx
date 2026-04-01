import React from 'react'

type Props = {
    count: number | null
}

export const GlobalUsersListTitle: React.FC<Props> = props => {
    return (
        <>
            Online
            {typeof props.count === 'number' && <>&nbsp;({props.count})</>}
        </>
    )
}
