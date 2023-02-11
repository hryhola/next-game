import { Box, Button, FormLabel, SvgIconTypeMap, SxProps, Theme } from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'
import { OverridableComponent } from '@mui/material/OverridableComponent'

interface Props {
    url?: string
    local?: boolean
    size?: number
    editable?: boolean
    onChange?: (image: File) => void
    maxSize?: string
    editBorder?: boolean
    editIcon?: OverridableComponent<SvgIconTypeMap<{}, 'svg'>>
    editLabel?: string
}

export const ProfilePicture: React.FC<Props> = props => {
    const size = props.size || 300

    const sizeProps = {
        width: size + 'px',
        height: size + 'px',
        maxHeight: undefined as undefined | string,
        maxWidth: undefined as undefined | string
    }

    if (props.maxSize) {
        sizeProps.maxHeight = props.maxSize
        sizeProps.maxWidth = props.maxSize
    }

    if (!props.editable) {
        if (!props.url) {
            return (
                <Box sx={sizeProps}>
                    <PersonIcon sx={sizeProps} />
                </Box>
            )
        }

        return (
            <Box
                sx={{
                    ...sizeProps,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <img alt="user avatar" src={props.url} />
            </Box>
        )
    }

    const buttonSx: SxProps<Theme> = {
        backgroundColor: 'none',
        display: 'flex',
        flexDirection: 'column',
        ...sizeProps,
        padding: 0
    }

    if (props.editBorder !== true) {
        buttonSx.border = 'none'
        // @ts-expect-error
        buttonSx[':hover'] = {
            border: 'none'
        }
    }

    return (
        <Button component="label" variant="outlined" sx={buttonSx}>
            <input type="file" name="image" accept="image/*" {...(props.onChange ? { onChange: e => props.onChange!(e.target.files![0]) } : {})} hidden />
            {props.url ? (
                <img alt="user avatar" src={props.url} />
            ) : (
                <>
                    {props.editIcon ? props.editIcon : <PersonIcon sx={sizeProps} />}
                    {props.editLabel && <FormLabel sx={{ fontSize: '0.8rem', mt: 1 }}>{props.editLabel}</FormLabel>}
                </>
            )}
        </Button>
    )
}
