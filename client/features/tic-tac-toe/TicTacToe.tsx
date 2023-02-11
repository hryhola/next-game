// import { Container } from '@mui/material'
// import React, { useState, useContext, useRef, useEffect } from 'react'
// import { TTicTacToePlayer } from 'state'
// import { chatInputHeight, LoadingOverlay } from 'client/ui'
// import { LobbyContext } from 'client/context/list/lobby'
// import { Chat } from '../chat/Chat'
// import Field from './Field'
// import Header from '../games/common/Header'
// import OverlayedTabs, { overlayedTabsToolbarHeight } from 'client/ui/overlayed-tabs/OverlayedTabs'
// import ChatIcon from '@mui/icons-material/Chat'
// import { UserContext } from 'client/context/list/user'
// import { api } from 'client/network-utils/api'
// import { URL } from 'client/network-utils/const'

// const TicTacToe = () => {
//     const lobby = useContext(LobbyContext)
//     const user = useContext(UserContext)

//     const [players, setPlayers] = useState<TTicTacToePlayer[]>([])
//     const [isLoading, setIsLoading] = useState(true)

//     const chatInputRef = useRef<HTMLInputElement | null>(null)

//     const isPlayable = players.some(p => p.user.nickname === user.nickname)

//     useEffect(() => {
//         ;(async () => {
//             const [response, postError] = await api.post(URL.LobbyJoin, {
//                 lobbyId: lobby.lobbyId
//             })

//             if (!response) {
//                 return console.error(String(postError))
//             }
//             // @ts-ignore
//             if (response.lobbyJoinResult) {
//                 // @ts-ignore
//                 lobby.setMembers(response.lobbyJoinResult.players)
//             }

//             // @ts-ignore
//             if (response.gameJoinResult) {
//                 // @ts-ignore
//                 setPlayers(response.gameJoinResult.players)
//             }

//             setIsLoading(false)

//             console.log(response)
//         })()
//     }, [])

//     return (
//         <>
//             <Container>
//                 <Field sx={{ my: 3 }} isLoading isPlayable={isPlayable} />
//                 <Header members={players} isLoading={isLoading} />
//             </Container>
//             <OverlayedTabs
//                 label="tic-tac-toe"
//                 views={[
//                     {
//                         onFullscreen: () => chatInputRef.current?.focus(),
//                         header: <ChatIcon />,
//                         view: fullscreen => (
//                             <Chat
//                                 messagesWrapperBoxSx={{
//                                     height: `calc(${fullscreen ? `var(--fullHeight) - ${overlayedTabsToolbarHeight}` : '50vh'} - ${chatInputHeight})`
//                                 }}
//                                 scope="lobby"
//                                 lobbyId={lobby.lobbyId}
//                                 inputRef={chatInputRef}
//                             />
//                         )
//                     }
//                 ]}
//             />
//         </>
//     )
// }

// export default TicTacToe

export {}
