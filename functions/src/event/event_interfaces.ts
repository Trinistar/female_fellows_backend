import { Timestamp } from "firebase-admin/firestore"
import { Address } from "../utils/Interfaces"

export interface Materials {
    clothes : string,
    food : string,
    information : string,
    planer : string
}

export interface Event {
    contactPerson : string
    date : Timestamp
    eventDescription : string
    eventEmail: string,
    eventPhoneNumber : string,
    eventTitle : string,
    host : string,
    location : Address
    material : Materials
    whatsAppLink : string
}