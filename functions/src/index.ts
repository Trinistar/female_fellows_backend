/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { initializeApp } from "firebase-admin/app"

initializeApp({
    databaseURL : "https://femalefellows-11bb9-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId : "femalefellows-11bb9",
    storageBucket : "femalefellows-11bb9.appspot.com"
})

export { pullGeodata } from "./geodata/geodata_methods"
export { onEventCreate, onEventUpdate, onEventParticipantCreate } from "./event/event_methods"
export { onDebugCustomClaimsCreate, onDebugCustomClaimsUpdate } from "./customClaims/customClaims_methods"
export { onFirebaseUserCreated, onUserCreated, onUserUpdated, onFirebaseUserDeleted, onUserDeleted } from "./user/user_methods"
export { onTandemMatchCreate, TandemMatchScheduler, onTandemMatchUpdate } from './tandemMatches/tandemMatches_method'
export { sendFcmToken, removeFcmToken } from "./fcm/fcm_methods"

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
