import {GetManyDocuments} from "../sdk/firestore_CRUD";
import {TandemMatches} from "./tandemMatches_interface";

export async function modifyTandemMatchesOfDeletedUser(userId : string){
    const newcomerMatches = await GetManyDocuments<TandemMatches>('tandemMatches',[{ field : "newcomer", operator : "==", value : userId }])
    if(!newcomerMatches){
        throw new Error("tandemMatches query failed")
    }
    const newcomerPromises = newcomerMatches.snap.docs.map(async doc => {
        await doc.ref.update({
            newcomer: null,
            enabled: false
        })
    })
    const requesterMatches = await GetManyDocuments<TandemMatches>('tandemMatches',[{ field : "requester", operator : "==", value : userId }])
    if(!requesterMatches){
        throw new Error("tandemMatches query failed")
    }
    const requesterPromises = newcomerMatches.snap.docs.map(async doc => {
        await doc.ref.update({
            requester: null,
            enabled: false
        })
    })
    await Promise.all([newcomerPromises, requesterPromises])
}