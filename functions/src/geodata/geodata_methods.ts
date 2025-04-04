import {DocumentReference, GeoPoint} from "firebase-admin/firestore"
import { AddressGeometry, Client as MapsClient } from "@googlemaps/google-maps-services-js"
import { geohashForLocation } from "geofire-common"
import { createTimestamp } from "../utils/Timestamp"
import * as functions from "firebase-functions"
import { GPSPosition, GeodataCache } from "./geodata_interfaces"
import { checkForAuthenticatedUser } from "../utils/Auth"
import { CustomError, GenericError, InvalidArgument, NoAuth } from "../utils/Error"
import CustomResponse from "../utils/Response"
import {CreateDocument, DeleteDocument, GetDocument} from "../sdk/firestore_CRUD"
import { Address } from "../utils/Interfaces"
import { printInfo } from "../logger"
import { GeolocationApiKey } from "../API"

export function toGeoPoint(pos : GPSPosition){
    return new GeoPoint(pos.lat, pos.lng)
}

export function toAddressString(address : Address){
    return `${address.street}, ${
        address.zipCode
    } ${address.city}`
}

export async function deleteGeodataDocument(ref : DocumentReference){
    const geodataDocRef = ref.collection('data').doc('geodata')
    const geodataDoc = await GetDocument(geodataDocRef);
    if(!geodataDoc){
        printInfo("No geodata document found, nothing to delete")
        return;
    }
    await DeleteDocument(geodataDocRef)
}

/**
 * converts the AddressGeometry interface of the Google Maps API into the GeodataCache interface
 * @param {AddressGeometry} geometry response of the geolocation api
 * @returns a geodataCache object
 */
function toGeodataCache(geometry : AddressGeometry) : GeodataCache {
    const geopoint = toGeoPoint(geometry.location)
    return {
        date : createTimestamp(),
        data : {
            location : geopoint,
            geohash: geohashForLocation([geopoint.latitude, geopoint.longitude]),
            viewport: {
                northeast : toGeoPoint(geometry.viewport.northeast),
                southwest : toGeoPoint(geometry.viewport.southwest)
            }
        }
    }
}

/**
 * Loads a GeodataCache document from the Firestore if available
 * @param addressString addressString which is the id of the GeodataCache document
 * @returns the Document Data parsed into geodataCache interface, null if the document not exist
 */
export async function getGeodatafromCache(addressString : string){
    const cacheDoc = await GetDocument<GeodataCache>(`geodataCache/${addressString}`)
    if(!cacheDoc){
        return null
    }
    return cacheDoc.data
}

/**
 * writes a new document into the geodataCache collection
 * @param addressString addressString which is the id of the geodataCache document
 * @param data data of the document
 * @returns the unfulfilled Promise
 */
function writeGeodataIntoCache(addressString : string, data : GeodataCache){
    return CreateDocument(`geodataCache/${addressString}`, data)
}

/**
 * initializes the Google Maps Geolocation API and calculates the geo data for an addressString
 * @param addressString addressString that is given to the Google Geolocation API
 * @returns the geodata converted into the geodataCache interface, null if no geodata found
 */
export async function fetchGeodata(addressString : string){
    const maps = new MapsClient({})
    const args = {
        params : {
            key : GeolocationApiKey.value(),
            address : addressString
        }
    }
    printInfo(`fetch geodata string for ${addressString}`)
    const response = await maps.geocode(args)
    if(response.status >= 400 || response.data.results.length <= 0){
        return null
    }
    const geometry = toGeodataCache(response.data.results[0].geometry)
    await writeGeodataIntoCache(addressString, geometry)
    return geometry
}

/**
 * an http endpoint that returns the geodata for a given address. 
 * 
 * error responses : 
 * 
 * unauthenticated - unknown user
 * invalid-arguments - missing arguments
 * unknown - geodata could not created
 */
export const pullGeodata = functions
    .region('europe-west1')
    .https
    .onCall(async function(data, context){
        try{
            if(!checkForAuthenticatedUser(context)){
                throw new NoAuth("unknown user")
            }
            const address : Address = data.address
            if(!address){
                throw new InvalidArgument( "missing arguments")
            }
            const addressString = toAddressString(address)
            const geodataCache = await getGeodatafromCache(addressString)
            if(geodataCache !== null){
                return new CustomResponse("pull geodata successfully", geodataCache.data.location).toObject
            }
            const geodata = await fetchGeodata(addressString)
            if(geodata !== null){
                return new CustomResponse("pull geodata successfully", geodata.data.location).toObject
            }
            throw new GenericError("geocode could not created")
        }catch(e : any){
            const error = new CustomError(e)
            throw error.response
        }
    })

