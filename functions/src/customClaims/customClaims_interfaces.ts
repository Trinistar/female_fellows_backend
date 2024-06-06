import { printError, printInfo } from "../logger"

export enum Roles {
    admin="ADMIN",
    user="USER"
}

/**
 * allowed access level 0 - 5
 */

export function isValidUserClaims(claims : any) : boolean {
    if(typeof claims !== 'object'){
        return false
    }
    const role = claims.role
    const accessLevel = claims.accessLevel
    if(!accessLevel || !role || Object.keys(claims).length > 2){
        return false
    }
    if(typeof role !== 'string' || typeof accessLevel !== 'number'){
        printError("wrong data type in custom claims")
        printInfo(claims)
        return false
    }
    if(!Object.values(Roles).includes(role as any) || (accessLevel < 0 || accessLevel > 5)){
        printInfo(claims)
        return false
    }
    return true
}

export interface UserClaims {
    role : Roles
    accessLevel : number
}