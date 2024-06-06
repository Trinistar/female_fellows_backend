import { Timestamp } from "firebase-admin/firestore"

interface FcmToken {
    token : string
    timestamp : Timestamp
}

interface FcmTokenDocument {
    tokens : FcmToken[]
}

export { FcmToken, FcmTokenDocument }