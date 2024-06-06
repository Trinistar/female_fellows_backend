import { CreateRequest, UpdateRequest, getAuth } from "firebase-admin/auth";
import { UserRecord } from "firebase-functions/v1/auth";
import { printError } from "../logger";

type UserID = string | UserRecord

interface GetResponse<T> {
    user : UserRecord
    claims : T
}

/**
 * This function downloads a Firebase user and parse the custom claims into interface T
 * @param id id of the firebase user
 * @returns The UserRecord and the custom claims as interface T or null in case of error
 */
async function GetUser<T>(id : string) : Promise<GetResponse<T> | null>{
    try{
        const auth = getAuth()
        const userRecord : UserRecord = await auth.getUser(id)
        return { user : userRecord, claims : userRecord.customClaims as T }
    }catch(e:any){
        printError(e.message)
        return null
    }
}

/**
 * creates a new firebase user
 * @param data data for the new user. The CreateRequest interface is from Google and supports some parameters 
 * https://firebase.google.com/docs/reference/admin/node/firebase-admin.auth.createrequest
 * @param claims a map containing the values for the custom claims
 * @returns the newly created firebase user or null in case of error
 */
async function CreateUser(data : CreateRequest, claims? : { [id:string] : any }){
    try{
        const auth = getAuth()
        const user = await auth.createUser(data)
        if(claims){
            await auth.setCustomUserClaims(user.uid, claims)
        }
        return user
    }catch(e:any){
        printError(e.message)
        return null
    }
}

/**
 * delete a firebase user
 * @param id id or userrecord of the user
 * @returns 0 if the operation was executed successfully, otherwise -1
 */
async function DeleteUser(id : UserID){
    try{
        const auth = getAuth()
        let userId : string;
        if(typeof id === 'string'){
            userId = id;
        }else{
            userId = id.uid
        }
        await auth.deleteUser(userId)
        return 0;
    }catch(e:any){
        printError(e.message)
        return -1
    }
}

interface UpdateOptions {
    properties? : UpdateRequest
    claims? : {[id:string]:any}
}

/**
 * update firebase user
 * @param id id or userrecord of the user
 * @param options optional, in the map, new properties for the user can be entered in the 
 * "properties" field ( UpdateRequest https://firebase.google.com/docs/reference/admin/node/firebase-admin.auth.updaterequest ), 
 * or new custom claims can be entered in the "claims" field, by default the map is empty
 * @returns 0 if the operation was executed successfully, otherwise -1
 */
async function UpdateUser(id : UserID, options : UpdateOptions = {}){
    try{
        const auth = getAuth()
        let userId : string;
        if(typeof id === 'string'){
            userId = id
        }else{
            userId = id.uid
        }
        if(options.properties){
            await auth.updateUser(userId, options.properties)
        }
        if(options.claims){
            await auth.setCustomUserClaims(userId, options.claims)
        }
        return 0
    }catch(e:any){
        printError(e.message)
        return -1
    }
}

export { GetUser, DeleteUser, UpdateUser, CreateUser }