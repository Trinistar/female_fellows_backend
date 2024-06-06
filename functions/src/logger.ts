import * as functions from "firebase-functions"

const logger = functions.logger

function print(text : string | string[], printFunc : (...args : any[]) => void){
    if(Array.isArray(text)){
        printFunc(text.join(' '))
    }
    return printFunc(text)
}

function printError(text : string | string[]){
    return print(text, logger.error)
}

function printInfo(text : string | string[]){
    return print(text, logger.info)
}

function printDebug(text : string | string[]) {
    return print(text, logger.debug)
}

export { printInfo, printError, printDebug }