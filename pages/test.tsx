import { PackThemesPreview } from 'client/features/games/jeopardy/frames/JeopardyPackThemesPreview'
import { GetServerSideProps, NextPage } from 'next'

type Props = {}

const Test: NextPage<Props> = props => {
    return (
        <PackThemesPreview
            id="a"
            packName="Уберпак 1"
            author="Davy Jones"
            dateCreated="21.12.1234"
            themes={[
                'lorem 1 sdfsdfsfsdsadasdfasdf',
                'lorem 2',
                'lorem 3',
                'lorem 4',
                'lorem 5',
                'lorem 6',
                'lorem 7',
                'lorem 8',
                'lorem 9',
                'lorem 10',
                'lorem 11',
                'lorem 12',
                'lorem 13',
                'lorem 14',
                'lorem 15',
                'lorem 16',
                'lorem 17',
                'lorem 18',
                'lorem 19',
                'lorem 20',
                'lorem 21',
                'lorem 22',
                'lorem 23',
                'lorem 24',
                'lorem 25'
            ]}
        />
    )
}

export const getServerSideProps: GetServerSideProps = async context => {
    const props: Props = {}

    return {
        props
    }
}

export default Test
