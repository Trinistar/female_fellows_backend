import { CallableContext } from "firebase-functions/v1/https";
import { printError } from "../logger";

/**
 * @description checks if the CallableContext of a cloud function was called by an authenticated user and if the user has the "SUPERADMIN" role
 * @param context CallableContext of a firebase cloud function
 * @returns {boolean} true if the cloud function was called by an authenticated user with SUPERADMIN role, otherwise false
 * @author Kristian Keil
 */
export function checkForAuthenticatedUser(context: CallableContext) {
    if (!context.auth) {
        printError('bad credentials');
        return false;
    }
    if (!context.auth?.token) {
        printError('insufficient access');
        return false;
    }
    return true;
}