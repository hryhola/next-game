import { Login } from '../../features/auth/Login'

import styles from './LoginRoute.module.scss'

export const LoginRoute: React.FC = () => {
    return (
        <div className={styles.container}>
            <Login />
        </div>
    )
}
