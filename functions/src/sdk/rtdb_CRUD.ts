import { DataSnapshot, Reference, getDatabase } from "firebase-admin/database";
import { printError } from "../logger";

type ReferenceID = string | Reference

export interface GetResponse<T> {
    snap : DataSnapshot
    data : T
}

/**
 * This function downloads a rtdb Document and parses the data of it into the specified interface T
 * @param id rtdb document as Reference or string
 * @returns The DataSnapshot and the document data as interface T, null if the rtdb document not exist
 * or in case of error
 */
async function GetReference<T>(id : ReferenceID): Promise<GetResponse<T> | null> {
    try{
        const rtdb = getDatabase()
        let dbReference: Reference;
        if (typeof id === "string"){
            dbReference = rtdb.ref(id)
        }else{
            dbReference = id
        }
        const document = await dbReference.get()
        if(!document.exists){
            return null;
        }
        return { snap : document , data : document.val() as T }
    }catch(e:any){
        printError(e.message)
        return null
    }
}

/**
 * update a rtdb document
 * @param id Reference or path of the Firestore document to be updated
 * @param data map that contains the new data for the document
 * @returns 0 if the operation was executed successfully, otherwise -1
 */
async function UpdateReference(id : ReferenceID, data : {[id:string] : any}){
    try{
        const rtdb = getDatabase()
        let dbReference: Reference;
        if (typeof id === "string"){
            dbReference = rtdb.ref(id)
        }else{
            dbReference = id
        }
        await dbReference.update(data)
        return 0
    }catch(e: any){
        printError(e.message)
        return -1
    }
}

/**
 * deletes a rtdb document
 * @param id Reference or path of the rtdb document to be deleted
 * @returns 0 if the operation was executed successfully, otherwise -1
 */
async function DeleteReference(id : ReferenceID){
    try{
        const rtdb = getDatabase()
        let dbReference: Reference;
        if (typeof id === "string"){
            dbReference = rtdb.ref(id)
        }else{
            dbReference = id
        }
        await dbReference.remove()
        return 0
    }catch(e: any){
        printError(e.message)
        return -1
    }
}

export { DeleteReference, UpdateReference, GetReference }