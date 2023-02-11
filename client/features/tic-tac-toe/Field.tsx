// import { Box, Button, ButtonProps, Grid, Skeleton, styled, SxProps, Theme } from '@mui/material'
// import { useState } from 'react'
// import CloseIcon from '@mui/icons-material/Close'
// import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'

// const Cell = styled(Button)<ButtonProps>(({ theme }) => ({
//     maxWidth: '200px',
//     maxHeight: '200px',
//     width: '30vw',
//     height: '30vw',
//     borderRadius: 0,
//     border: '1px solid'
// }))

// type Props = {
//     sx?: SxProps<Theme>
//     isPlayable?: boolean
//     isLoading?: boolean
// }

// const Field: React.FC<Props> = props => {
//     const [cellValues, setCellValues] = useState<('x' | 'o' | null)[][]>([
//         [null, null, null],
//         [null, null, null],
//         [null, null, null]
//     ])

//     const cellClickHandler: React.MouseEventHandler<HTMLButtonElement> = e => {
//         const button = e.target as HTMLButtonElement

//         const [x, y] = button.id.split('-')

//         setCellValues(value => {
//             value[Number(x)][Number(y)] = 'o'

//             return value.slice()
//         })
//     }

//     return (
//         <Box sx={props.sx}>
//             {cellValues.map((row, x) => (
//                 <Grid key={x} justifyContent="center" wrap="nowrap" container>
//                     {row.map((cell, y) => (
//                         <Grid justifyContent="center" key={y} item>
//                             {props.isLoading ? (
//                                 <Skeleton
//                                     variant="rectangular"
//                                     sx={{
//                                         width: 200,
//                                         maxWidth: '29vw',
//                                         height: 200,
//                                         maxHeight: '29vw',
//                                         m: 0.2,
//                                         boxSizing: 'border-box'
//                                     }}
//                                 />
//                             ) : (
//                                 <Cell disabled={!props.isPlayable} id={x + '-' + y} onClick={cellClickHandler} variant="contained" color="primary">
//                                     {cell === 'x' && <CloseIcon sx={{ fontSize: 80 }} />}
//                                     {cell === 'o' && <RadioButtonUncheckedIcon sx={{ fontSize: 80 }} />}
//                                 </Cell>
//                             )}
//                         </Grid>
//                     ))}
//                 </Grid>
//             ))}
//         </Box>
//     )
// }

// export default Field

export {}
