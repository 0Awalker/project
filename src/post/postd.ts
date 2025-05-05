export type DataType = {
    username: string
    deviceName: string
}

export enum ApiStatus {
    success = "success",
    error = "error",
    process = "processing",
    wait = "waiting"
}