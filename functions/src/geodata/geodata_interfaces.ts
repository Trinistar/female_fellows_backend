import { GeoPoint, Timestamp } from "firebase-admin/firestore"

/**
 * 
 */
export interface GeodataCache {
    date : Timestamp
    data : {
        location : GeoPoint
        geohash : string
        viewport : {
            northeast : GeoPoint
            southwest : GeoPoint
        }
    }
}

export interface GPSPosition {
    lat : number,
    lng : number
}