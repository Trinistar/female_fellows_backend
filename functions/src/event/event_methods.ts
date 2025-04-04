import * as functions from "firebase-functions"
import { printError } from "../logger"
import { Event } from "./event_interfaces"
import { didFieldChange } from "../utils/Field"
import { fetchGeodata, getGeodatafromCache, toAddressString } from "../geodata/geodata_methods"
import { DocumentSnapshot } from "firebase-admin/firestore"
import { GenericError } from "../utils/Error"
import { GetManyDocuments, UpsertDocument} from "../sdk/firestore_CRUD"
import { GeolocationApiKey } from "../API"
import { Roles } from "../customClaims/customClaims_interfaces"
import { sendFcmNotifications } from "../fcm/fcm_methods"

/**
 * creates a subcollection below the given firestore document with geodata. For this, an "address" field must be present in the document
 * @param snap firestore document under which the geodata is to be stored 
 * @returns basically, nothing ...
 */
async function generateEventGeodata(snap : DocumentSnapshot){
    const geodataRef = snap.ref.collection('data').doc("geodata")
    const event = snap.data() as Event
    if(!event.location){
        throw new GenericError("malformed event or missing location")
    }
    const addressString = toAddressString(event.location)
    const geodataCache = await getGeodatafromCache(addressString)
    if(geodataCache !== null){
        await UpsertDocument(geodataRef, geodataCache)
        return;
    }
    const geodata = await fetchGeodata(addressString)
    if(geodata !== null){
        await UpsertDocument(geodataRef, geodata)
        return;
    }else{
        throw new GenericError("geodata could not create")
    }
}

/**
 * a trigger that is executed when a new firebase user is created. Writes custom claims to the firebase user
 */
export const onEventCreate = functions
    .region('europe-west1')
    .runWith({ secrets : [GeolocationApiKey] })
    .firestore.document(`/event/{eventID}`)
    .onCreate(async function(snapshot, context){
        try {
            await generateEventGeodata(snapshot)
        }catch(e:any){
            printError(e.message)
        }
    }
)

/**
 * a trigger that is executed when a document in the "event" collection is updated. update geodata if the field "address" is updated
 */
export const onEventUpdate = functions
    .region('europe-west1')
    .runWith({ secrets : [GeolocationApiKey] })
    .firestore.document(`/event/{eventID}`)
    .onUpdate(async function(change, context){
        try {
            const after = change.after
            const before = change.before
            if(didFieldChange(before.data(), after.data(), "location")){
                await generateEventGeodata(after)
            }
        }catch(e:any){
            printError(e)
        }
    }
)

export const onEventParticipantCreate = functions
    .region('europe-west1')
    .firestore.document(`/event/{eventID}/participants/{participantId}`)
    .onCreate(async function(snapshot, context){
        try{
            const users = await GetManyDocuments<any>("user",[{ field : "role", operator : "==",value : Roles.admin}])
            const participantId = context.params["participantId"]
            if(!users){
                throw new Error("no admins found")
            }
            const promises = users.snap.docs.map((user) => {
                return sendFcmNotifications(user.id, "New Event Participant", "A new participant has joined your event. Tab to go to the event.", {
                    participant : participantId,
                    event : context.params['eventID']
                })
            })
            const results = await Promise.all(promises)
            if(results.some((result) => result === false)){
                throw new Error("some notifications could not be sent")
            }
        }catch(e:any){
            printError(e.message)
        }
    })
