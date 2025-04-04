import * as firebaseFunctions from "firebase-functions"
import {CreateDocument, GetDocument, UpsertDocument} from "../sdk/firestore_CRUD";
import { FcmToken, FcmTokenDocument } from "./fcm_interfaces";
import { createTimestamp } from "../utils/Timestamp";
import { FieldValue } from "firebase-admin/firestore";
import { printError } from "../logger";
import { CustomError, GenericError, NoAuth } from "../utils/Error";
import { Message } from "firebase-admin/lib/messaging/messaging-api";
import { deliverFcmNotifications } from "../sdk/fcm";

export const sendFcmToken = firebaseFunctions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
        try {
            if (!context.auth) {
                throw new NoAuth("missing credentials")
            }
            if (!data.token) {
                throw new Error("missing token")
            }
            const uid = context.auth.uid;
            let tokenExists: boolean = false
            const document = await GetDocument<FcmTokenDocument>(`fcmToken/${uid}`)
            if (document !== null) {
                document.data.tokens.forEach((fcm) => {
                    if (fcm.token === data.token) {
                        tokenExists = true
                    }
                })
            }
            if(tokenExists){
                return { result : "token already exists" }
            }
            const payload: FcmToken = {
                token: data.token,
                timestamp: createTimestamp()
            }
            const result = await CreateDocument(`fcmToken/${uid}`, {
                tokens: FieldValue.arrayUnion(payload)
            })
            if (result === null) {
                throw new GenericError("upsert token failed")
            }
            return { result: 'success' };
        } catch (e: any) {
            const error = new CustomError(e)
            printError(error.message)
            return error.response
        }
    });

export const removeFcmToken = firebaseFunctions.region('europe-west1').https.onCall(async (data, context) => {
    try {
        if (!context.auth || !context.auth.token) {
            throw new NoAuth("missing credentials")
        }
        if (!data.token) {
            throw new Error("missing token")
        }
        const uid = context.auth.uid;
        const id = `fcmToken/${uid}`
        const document = await GetDocument<FcmTokenDocument>(id)
        if (document === null) {
            throw new GenericError("can not find document")
        }
        let toDelete: FcmToken | null = null
        document.data.tokens.forEach((fcm) => {
            if (fcm.token === data.token) {
                toDelete = fcm
            }
        })
        if (toDelete === null) {
            throw new GenericError("can not find token")
        }
        const result = await UpsertDocument(`fcmToken/${uid}`, {
            tokens: FieldValue.arrayRemove(toDelete)
        })
        if (result === null) {
            throw new GenericError("remove token failed")
        }
        return { result: 'success' };
    } catch (e: any) {
        const error = new CustomError(e)
        printError(error.message)
        return error.response
    }
});

export async function sendFcmNotifications(userId: string, title: string = "", body: string = "", data: { [id: string]: string } = {}) {
    try {
        const tokenDocument = await GetDocument<FcmTokenDocument>(`fcmToken/${userId}`)
        if (tokenDocument === null) {
            throw new GenericError("no tokens found")
        }
        const tokens = tokenDocument.data.tokens.map((fcm) => fcm.token)
        const notificationPayloads: Message[] = []
        tokens.forEach((token) => {
            notificationPayloads.push({
                notification: {
                    title: title,
                    body: body,
                },
                data: data,
                token
            })
        })
        const deliverResult = await deliverFcmNotifications(notificationPayloads, false)
        if (deliverResult === null) {
            throw new GenericError("can not send fcm notifications")
        }
        if (deliverResult.failureCount > (notificationPayloads.length * 0.7)) {
            throw new GenericError("most of the notifications have failed, repetition is recommended")
        }
        return true
    } catch (e: any) {
        printError(e.message)
        return false
    }
}