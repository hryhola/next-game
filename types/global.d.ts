namespace Api {
    declare type Success<Data = any> = {
        success: true
        data: Data
    }

    declare type Failure = {
        success: false
        errorMessage: string
    }

    declare type FailureWithDate<Data = any> = Failure & {
        data: Data
    }
}

declare interface ChatMessage {
    id: string
    username: string
    text: string
}

declare interface User {
    id: string
}

declare interface Chat {
    id: string
    users: Array<User>
    messages: Array<ChatMessage>
}
