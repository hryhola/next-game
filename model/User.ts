export class User {
    id: string

    constructor(id: string) {
        this.id = id
    }
}

export type TUser = ExcludeMethods<User>
