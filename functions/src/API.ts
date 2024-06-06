/**
 * firebase api key can be stored here as it is not necessary to keep it secret
 * @link https://firebase.google.com/docs/projects/api-keys
 * 
 * !! DO NOT use this file for keys that must be secret under any circumstances !!
 */

import { defineSecret } from "firebase-functions/params";

const GeolocationApiKey = defineSecret('ZEUS_API_KEY');

export { GeolocationApiKey }