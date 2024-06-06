import * as functions from "firebase-functions"
import { GetDocument, GetManyDocuments, UpdateDocument } from "../sdk/firestore_CRUD"
import { printError, printInfo } from "../logger"
import { GenericError } from "../utils/Error"
import { FieldValue } from "firebase-admin/firestore"
import { Roles } from "../user/user_interfaces"
import { TandemMatches, TandemMatchesState } from "./tandemMatches_interface"
import { runTasksAsync } from "../utils/Tasks"
import { createTimestamp } from "../utils/Timestamp"
import { didFieldChange } from "../utils/Field"
import { sendFcmNotifications } from "../fcm/fcm_methods"

export const onTandemMatchCreate = functions.region('europe-west1').firestore.document(`tandemMatches/{tandemMatchId}`)
    .onCreate(async function (snap, context) {
        try {
            const match = snap.data() as TandemMatches
            const local = await GetDocument<any>(`/user/${match.local}`)
            const newcomer = await GetDocument<any>(`/user/${match.newcomer}`)
            if (!local || !newcomer) {
                throw new GenericError("user can not found")
            }
            if (newcomer.data.localOrNewcomer === Roles.newcomer) {
                await UpdateDocument(newcomer.snap.ref, { localMatch: match.local })
            }
            if (local.data.localOrNewcomer === Roles.local) {
                await UpdateDocument(local.snap.ref, { newcomerMatches: FieldValue.arrayUnion(match.newcomer) })
            }
            await sendFcmNotifications(match.newcomer === match.requester ? match.local : match.newcomer, "you are requested", "your are requested", {
                requester: match.newcomer === match.requester ? match.newcomer : match.local
            })
        } catch (e: any) {
            printError(e.message)
        }
    })

export const onTandemMatchUpdate = functions.region('europe-west1').firestore.document(`tandemMatches/{tandemMatchId}`)
    .onUpdate(async function (snap, context) {
        try {
            const after = snap.after
            const before = snap.before
            async function disableTandemMatch() {
                const match = after.data() as TandemMatches
                const local = await GetDocument<any>(`/user/${match.local}`)
                const newcomer = await GetDocument<any>(`/user/${match.newcomer}`)
                if (!local || !newcomer) {
                    throw new GenericError("user can not found")
                }
                if (newcomer.data.localOrNewcomer === Roles.newcomer) {
                    await UpdateDocument(newcomer.snap.ref, { localMatch: null, matchConfirmed: false })
                }
                if (local.data.localOrNewcomer === Roles.local) {
                    await UpdateDocument(local.snap.ref, { newcomerMatches: FieldValue.arrayRemove(match.newcomer), matchConfirmed: false })
                }
                await sendFcmNotifications(match.newcomer === match.requester ? match.local : match.newcomer, "your are declined", "your are declined", {
                    requester : match.newcomer === match.requester ? match.newcomer : match.local
                })
            }
            async function confirmTandemMatch() {
                const match = after.data() as TandemMatches
                const local = await GetDocument<any>(`/user/${match.local}`)
                const newcomer = await GetDocument<any>(`/user/${match.newcomer}`)
                if (!local || !newcomer) {
                    throw new GenericError("user can not found")
                }
                if (newcomer.data.localOrNewcomer === Roles.newcomer) {
                    await UpdateDocument(newcomer.snap.ref, { matchConfirmed: true })
                }
                if (local.data.localOrNewcomer === Roles.local) {
                    await UpdateDocument(local.snap.ref, { matchConfirmed: true })
                }
                await sendFcmNotifications(match.newcomer === match.requester ? match.local : match.newcomer, "your are confirmed", "your are confirmed", {
                    requester: match.newcomer === match.requester ? match.newcomer : match.local
                })
            }
            if (didFieldChange(before.data(), after.data(), "enabled") && after.data().enabled === false) {
                await disableTandemMatch()
            }
            if (didFieldChange(before.data(), after.data(), "state") && after.data().state === TandemMatchesState.declined) {
                await disableTandemMatch()
            }
            if (didFieldChange(before.data(), after.data(), "state") && after.data().state === TandemMatchesState.confirmed) {
                await confirmTandemMatch()
            }
        } catch (e: any) {
            printError(e.message)
        }
    })


export const TandemMatchScheduler = functions.region('europe-west1').pubsub.schedule('*/5 * * * *').onRun(async function (context) {
    try {
        const matches = await GetManyDocuments<TandemMatches>('tandemMatches', [{ field: "enabled", operator: "==", value: true }])
        if (!matches || matches.snap.empty) {
            printInfo("no matches found")
            return
        }
        const promises: (() => Promise<any>)[] = []
        matches.snap.forEach((doc) => {
            promises.push(async function () {
                const match = doc.data() as TandemMatches
                if (match.requested < createTimestamp({ hours: 24 }, "-")) {
                    await UpdateDocument(doc.ref, {
                        enabled: false
                    })
                }
            })
        })
        await runTasksAsync(promises)
    } catch (e: any) {
        printError(e.message)
    }
})
