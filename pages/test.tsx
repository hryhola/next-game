import { PackPreview } from 'client/features/games/jeopardy/frames/JeopardyPackPreview'
import { GlobalModalProvider, useGlobalModal } from 'client/features/global-modal/GlobalModal'
import { GetServerSideProps, NextPage } from 'next'
import { useEffect } from 'react'

function T() {
    const modal = useGlobalModal()

    useEffect(() => {
        modal.confirm({
            actionRequired: true,
            header: 'Bla?',
            onConfirm: () => {}
        })
    }, [])

    return <></>
}

type Props = {}

const Test: NextPage<Props> = props => {
    return (
        <>
            <T />
            <GlobalModalProvider />
        </>
    )
}

export const getServerSideProps: GetServerSideProps = async context => {
    const props: Props = {}

    return {
        props
    }
}

export default Test
