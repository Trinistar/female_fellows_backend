import { printError } from "../logger";
import * as functions from "firebase-functions"
import { createTimestamp } from "../utils/Timestamp";
import { Roles, UserClaims, isValidUserClaims } from "./customClaims_interfaces"
import { GetUser, UpdateUser } from "../sdk/auth_CRUD";
import { UpdateReference } from "../sdk/rtdb_CRUD";
import { UpdateDocument } from "../sdk/firestore_CRUD";
import { FieldValue } from "firebase-admin/firestore";

/**
 * update user with custom claims, additionally writes a timestamp in the rtdb so that clients 
 * can receive the new claims even without a new login
 * @param {string} uid id of the firebase user
 * @param {Roles} role role that the user should get, the enum '{Roles}' contains all possible roles
 * @param {number} accessLevel accessLevel that the user should get, possible values can found in file customClaims_interfaces
 */
async function setCustomClaims(uid: string, role: Roles, accessLevel: number = 0) {
    const c: UserClaims = {
        role: role,
        accessLevel: accessLevel
    }
    await UpdateUser(uid, {claims : c})
    await UpdateReference(`metadata/${uid}`, { refreshTime : createTimestamp() })
}

/**
 * get custom claims of a firebase user
 * @param uid id of the firebase user
 * @returns the custom claims, null in case of error
 */
async function getCustomClaims(uid : string){
    try{
        const user = await GetUser<UserClaims>(uid)
        if(user === null){
            return;
        }
        return user.claims
    }catch(e:any){
        printError(e.message)
        return null
    }
}

/**
 * writes the custom claims of a user into the document, 
 * but only in the case that the created document has the id of the Firebase user
 */
const onDebugCustomClaimsCreate = functions
    .region('europe-west1')
    .firestore.document('/debugCustomClaims/{uid}')
    .onCreate(async function (snapshot, context) {
        try {
            const uid = context.params['uid']
            const claims = await getCustomClaims(uid)
            await snapshot.ref.update({ applyChanges: false, claims: claims || {} })
        } catch (e: any) {
            printError(e.message)
        }
    })

/**
 * updates the custom claims of a user, but only if there is a "newClaims" 
 * field that contains the new claims and the applyChanges field is true
 */
const onDebugCustomClaimsUpdate = functions
    .region('europe-west1')
    .firestore.document('/debugCustomClaims/{uid}')
    .onUpdate(async function (change, context) {
        let payload = {}
        try {
            const after = change.after
            const { applyChanges, newClaims } = after.data()!
            if(applyChanges){
                if(newClaims && isValidUserClaims(newClaims)){
                    const uid = context.params['uid']
                    await setCustomClaims(uid, newClaims.role, newClaims.accessLevel)
                    const claims = await getCustomClaims(uid)
                    payload = { applyChanges: false, claims: claims || {}, error : FieldValue.delete() }
                }else{
                    payload = { applyChanges: false, error : "missing or malformed claims" }
                    printError("missing or malformed claims")
                }
            }
        } catch (e: any) {
            payload = { applyChanges : false, error : e.message || "error" }
            printError(e.message)
        } finally {
            await UpdateDocument(change.after.ref,payload)
        }
    })

export { setCustomClaims, getCustomClaims, onDebugCustomClaimsCreate, onDebugCustomClaimsUpdate }