import { Timestamp } from "firebase-admin/firestore";

enum TandemMatchesState {
    requested="requested",
    confirmed="confirmed",
    declined="declined",
    rerequested="rerequested"
}

interface TandemMatches {
    enabled : boolean
    requested : Timestamp
    state : TandemMatchesState
    requester : string
    local : string
    newcomer : string
}

export { TandemMatchesState, TandemMatches }