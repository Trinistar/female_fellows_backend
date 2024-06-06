import { Timestamp } from "firebase-admin/firestore"
import { createTimestamp } from "./Timestamp"

class CustomResponse {
    public statusCode : number
    public timestamp : Timestamp
    public message : string
    public data : {[id:string]:any} = {}

    constructor(message: string, data : {} = {}) {
        this.statusCode = 200,
        this.message = message
        this.timestamp = createTimestamp()
        this.data = data
    }

    get toObject(){
        return {
            statusCode : this.statusCode,
            message : this.message,
            data : this.data,
            timestamp : this.timestamp,
        }
    }
}

export default CustomResponse