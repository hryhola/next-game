import { Box } from '@mui/material'
import OverlayedTabs from 'client/ui/overlayed-tabs/OverlayedTabs'
import ChatIcon from '@mui/icons-material/Chat'
import { NextPage } from 'next'

const Lobby: NextPage = props => {
    return (
        <>
            <Box sx={{ height: 'var(--fullHeight)', backgroundColor: '#123' }}>
                Lorem ipsum dolor sit amet consectetur, adipisicing elit. Numquam, voluptas. Reprehenderit maiores vel nemo odit quisquam sed veritatis earum ea
                totam, dicta ab sit magnam alias nesciunt dolores sint fugit. Lorem ipsum dolor sit amet consectetur adipisicing elit. Earum at beatae molestiae
                facilis qui veritatis, laborum sapiente atque cum corrupti dolor suscipit repudiandae tempora, consectetur fugit similique ratione quia
                laboriosam? Iste nostrum eos pariatur dolore nihil necessitatibus exercitationem inventore est provident? Tenetur, maiores non quos voluptas
                eligendi totam iusto veritatis. Sequi neque repellendus provident veritatis tempora porro iste, totam unde. Cumque, perferendis. Voluptatibus
                animi tenetur minima iste voluptas expedita, impedit cumque. Animi, quos magnam. Omnis adipisci ullam, velit quam illum nulla delectus corporis
                dolor porro tempora et harum cum magnam! Voluptatem nobis porro id? Tenetur similique expedita sit dolore nemo harum nam explicabo itaque rerum
                fugit, laudantium aspernatur quisquam, doloribus maiores accusamus eius cupiditate sapiente praesentium rem iure unde animi. Sunt rem quo
                nostrum fugit quod. Harum magni nisi est cum voluptas, asperiores modi quasi unde excepturi quo temporibus laboriosam sed tempore error
                dignissimos incidunt? Rerum vero tenetur voluptatibus dolor. Fuga, cum laudantium? Voluptates, provident, architecto dolores dignissimos soluta
                blanditiis similique dolorum temporibus repellat aut molestias dicta omnis id qui adipisci asperiores facilis sapiente velit saepe ut
                repellendus quae. Totam? Facilis vero tenetur dicta, eos inventore hic voluptatum ab architecto. Repellendus qui iure ea eaque sunt! Similique
                cum accusantium quos dolorem explicabo, assumenda laboriosam et hic, laudantium culpa sapiente enim! Sequi doloribus quasi quas minima provident
                quam ullam officiis quisquam debitis et labore, unde error. Odio nesciunt tempore excepturi, animi rem ipsam dolor cum quia, consequuntur porro
                iure eligendi velit? Quis corrupti dicta libero vitae fugit ex, harum odio rem sint, iusto quae cum voluptatem dolores illum quaerat rerum
                blanditiis debitis eveniet vel eius atque dolorem? Impedit aperiam vel minima. Itaque quas, ipsum animi officiis voluptates aliquid quae quo,
                incidunt eum earum fuga excepturi, omnis nostrum? Architecto amet, optio illo fuga modi saepe voluptates accusantium labore quidem, perferendis
                veniam perspiciatis? Sed dolores explicabo facere est quis. Blanditiis, quis non ad cumque voluptate ea dolorem quisquam accusamus qui
                dignissimos dolore recusandae iste saepe ex, tempora incidunt soluta. Quasi doloremque facere earum. Maxime consequuntur voluptate animi. Earum
                quia, molestiae, sint quae molestias possimus ex facere et dicta rerum laborum nesciunt voluptas nam non maxime qui, reiciendis repellendus
                minima? Nostrum reiciendis dignissimos dolorum. Molestias cupiditate laudantium iure amet doloremque voluptas est harum sit sint vitae labore
                fugiat quae fuga voluptatibus voluptates itaque quidem quisquam debitis, sequi voluptate placeat officia dolore. Ex, cupiditate vero? Esse unde
                labore tenetur perferendis quam consequatur aliquid itaque maxime error nulla expedita sunt dolore nesciunt necessitatibus, numquam dolorem
                soluta aliquam. Quod ipsa et qui accusantium labore pariatur assumenda earum?
            </Box>
            <OverlayedTabs
                label="ur mom"
                views={[
                    {
                        header: <ChatIcon />,
                        view: () => <>Lebra asdfasdfasdfasdf</>
                    },
                    {
                        header: 'users',
                        view: () => <>CsadsASD n</>
                    }
                ]}
            />
        </>
    )
}

export default Lobby
