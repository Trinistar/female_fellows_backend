import { FunctionsErrorCode } from "firebase-functions/v2/https";
import * as functions from "firebase-functions"
import { Timestamp } from "firebase-admin/firestore";
import { createTimestamp } from "./Timestamp";
const HttpsError = functions.https.HttpsError

class CustomError extends Error {
    public statusCode : FunctionsErrorCode
    public timestamp : Timestamp
    public message : string

    constructor(error: GenericError) {
        super(error.message);
        this.statusCode = this.determineStatus(error)
        this.message = error.message
        this.timestamp = createTimestamp()
    }

    public determineStatus(e : GenericError){
        if(e instanceof NoAccess){
            return e.statusCode
        }
        if(e instanceof NoAuth){
            return e.statusCode
        }
        if(e instanceof NoFound){
            return e.statusCode
        }
        if(e instanceof AlreadyExist){
            return e.statusCode
        }
        return "unknown"
    }

    get response(){
        return new HttpsError(this.statusCode, this.message, 
        {
            statusCode : this.statusCode,
            message : this.message,
            timestamp : this.timestamp,
        })
    }
}

class GenericError extends Error {
    constructor(message : string) {
        super(message);
    }
}

class AlreadyExist extends GenericError {
    public statusCode : FunctionsErrorCode = "already-exists"
    constructor(message : string, ...args : any[]){
        super(message)
    }
}

class NoAccess extends GenericError {
    public statusCode : FunctionsErrorCode = "permission-denied"
    constructor(message : string) {
        super(message);
    }
}

class NoAuth extends GenericError {
    public statusCode : FunctionsErrorCode = "unauthenticated"
    constructor(message : string) {
        super(message);
    }
}

class NoFound extends GenericError {
    public statusCode : FunctionsErrorCode = "not-found"
    constructor(message : string) {
        super(message)
    }
}

class InvalidArgument extends GenericError {
    public statusCode : FunctionsErrorCode = "invalid-argument"
    constructor(message : string) {
        super(message)
    }
}

export {NoAccess, CustomError, NoAuth, GenericError, NoFound, AlreadyExist, InvalidArgument}