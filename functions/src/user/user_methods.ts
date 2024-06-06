import * as functions from "firebase-functions"
import { setCustomClaims } from "../customClaims/customClaims_methods"
import { printError } from "../logger"
import { Roles } from "../customClaims/customClaims_interfaces"
import { DocumentSnapshot } from "firebase-admin/firestore"
import { GenericError } from "../utils/Error"
import { fetchGeodata, getGeodatafromCache, toAddressString } from "../geodata/geodata_methods"
import { UpsertDocument } from "../sdk/firestore_CRUD"
import { didFieldChange } from "../utils/Field"
import { runTasksAsync } from "../utils/Tasks"
import { GeolocationApiKey } from "../API"

/**
 * creates a subcollection below the given firestore document with geodata. For this, an "address" field must be present in the document
 * @param snap firestore document under which the geodata is to be stored 
 * @param isVisible a flag that indicates whether the address is publicly visible
 * @returns basically, nothing ...
 */
async function generateUserGeodata(snap: DocumentSnapshot, isVisible: boolean = true) {
    const geodataRef = snap.ref.collection('data').doc("geodata")
    const user = snap.data() as any
    if (!user.address) {
        throw new GenericError("malformed user or missing address")
    }
    const addressString = toAddressString(user.address)
    const geodataCache = await getGeodatafromCache(addressString)
    if (geodataCache !== null) {
        await UpsertDocument(geodataRef, { ...geodataCache, isVisible: isVisible, name: user.address.city })
        return;
    }
    const geodata = await fetchGeodata(addressString)
    if (geodata !== null) {
        await UpsertDocument(geodataRef, { ...geodata, isVisible: isVisible, name: user.address.city })
        return;
    } else {
        throw new GenericError("geodata could not create")
    }
}

/**
 * a trigger that is executed when a new firebase user is created. Writes custom claims to the firebase user
 */
export const onFirebaseUserCreated = functions
    .region('europe-west1')
    .auth.user()
    .onCreate(async function (user) {
        try {
            await setCustomClaims(user.uid, Roles.user)
        } catch (e: any) {
            printError(e.message)
        }
    })

/**
 * trigger that is executed when a new document in the collection "user" is created
 */
export const onUserCreated = functions
    .region('europe-west1')
    .runWith({ secrets : [GeolocationApiKey] })
    .firestore.document(`/user/{userId}`)
    .onCreate(async function (snapshot, context) {
        const promises: (() => Promise<any>)[] = []
        try {
            promises.push(async function () {
                const address = snapshot.data().address
                if (!address) {
                    return;
                }
                await generateUserGeodata(snapshot)
            })
            await runTasksAsync(promises)
        } catch (e: any) {
            printError(e.message)
        }
    })

/**
* trigger that is executed when a new document in the collection "user" is updated
*/
export const onUserUpdated = functions
    .region('europe-west1')
    .runWith({ secrets : [GeolocationApiKey] })
    .firestore.document(`/user/{userId}`)
    .onUpdate(async function (snapshot, context) {
        const promises: (() => Promise<any>)[] = []
        try {
            const after = snapshot.after
            const before = snapshot.before
            if (didFieldChange(before.data(), after.data(), "address")) {
                promises.push(async function () {
                    const address = after.data().address
                    if (!address) {
                        return;
                    }
                    await generateUserGeodata(after)
                })
            }

            await runTasksAsync(promises)
        } catch (e: any) {
            printError(e.message)
        }
    })