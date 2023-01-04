import Container from '@mui/material/Container'
import { Login } from '../../features/auth/Login'

import styles from './LoginRoute.module.scss'

export const LoginRoute: React.FC = () => {
    return (
        <Container>
            <Login />
        </Container>
    )
}
