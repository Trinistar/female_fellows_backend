import {
    DocumentReference,
    DocumentSnapshot,
    FieldPath,
    Query,
    WhereFilterOp,
    WriteResult,
    getFirestore,
} from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import {createTimestamp} from "../utils/Timestamp";

const logger = functions.logger;
type DataID = string | DocumentReference;

interface QueryConstraint {
    field: FieldPath | string;
    operator: WhereFilterOp;
    value: string | boolean | number;
}

export interface GetResponse<T> {
    snap: DocumentSnapshot;
    data: T;
}

/**
 * This function downloads a Firestore Document and parses the data of it into the specified interface T
 * @param id path of the document as DocumentReference or string
 * @returns The DocumentSnapshot and the document data as interface T, null if the document does not exist or in case of error
 */
async function GetDocument<T>(id: DataID): Promise<GetResponse<T> | null> {
    try {
        const db = getFirestore();
        let documentRefernce: DocumentReference;
        if (id instanceof DocumentReference) {
            documentRefernce = id;
        } else {
            documentRefernce = db.doc(id);
        }
        const document = await documentRefernce.get();
        if (!document.exists) {
            return null;
        }
        return { snap: document, data: document.data()! as T };
    } catch (e: any) {
        logger.error(e.message);
        return null;
    }
}

interface Options {
    group: boolean;
    limit: number;
}

/**
 * assembles a firestore query, also chains several where conditions together, but this should only be used if the corresponding indexes have been created
 * @param collectionName collection from which the documents are to be downloaded
 * @param queryConstraints contains the data required to form the query
 * @param options an optional field, 'group' must be set to true to search for the collection as collectiongroup, 
 * 'limit' can be used to limit the amount of returned documents
 * @returns the query
 */
function buildQuery(
    collectioName: string,
    queryConstraints: QueryConstraint[],
    options: Options = { group: false, limit: 0 }
) {
    function addQueryContraints(q: Query, queryCs: QueryConstraint[]) {
        let tmp = q;
        queryCs.forEach((queryC) => {
            tmp = tmp.where(queryC.field, queryC.operator, queryC.value);
        });
        return tmp;
    }
    const db = getFirestore();
    let query: Query;
    if (options.group) {
        query = db.collectionGroup(collectioName);
    } else {
        query = db.collection(collectioName);
    }
    query = addQueryContraints(query, queryConstraints);
    if (options.limit > 0) {
        query = query.limit(options.limit);
    }
    return query;
}

/**
 * This function downloads many Firestore Documents and parses the data of each document into the specified interface T
 * @param collectionName collection from which the documents are to be downloaded
 * @param queryConstraints contains the data required to form the query
 * @param options an optional field, 'group' must be set to true to search for the collection as collectiongroup, 
 * 'limit' can be used to limit the amount of returned documents
 * @returns a list of DocumentSnapshots and the data of them as interface T, null in case of error
 */
async function GetManyDocuments<T>(
    collectioName: string,
    queryConstraints: QueryConstraint[],
    options: Options = { group: false, limit: 0 }
) {
    try {
        const query = buildQuery(collectioName, queryConstraints, options);
        const snapshot = await query.get();
        return { snap: snapshot, docs: snapshot.docs.map((doc) => doc.data() as T) };
    } catch (e: any) {
        logger.error(e.message);
        return null;
    }
}

/**
 * update a firestore document
 * @param id DocumentReference or path of the Firestore document to be updated
 * @param data map that contains the new data for the document
 * @returns a map that contains the write date and a function with which the updated document can be compared with another one,
 * null in case of error
 */
async function UpdateDocument(id: DataID, data: { [id: string]: any }) {
    try {
        const db = getFirestore();
        let documentRefernce: DocumentReference;
        if (id instanceof DocumentReference) {
            documentRefernce = id;
        } else {
            documentRefernce = db.doc(id);
        }
        const updateResult = await documentRefernce.update(data);
        return { timestamp: updateResult.writeTime, compare: (w: WriteResult) => updateResult.isEqual(w) };
    } catch (e: any) {
        logger.error(e.message);
        return null;
    }
}

/**
 * deletes a firestore document
 * @param id DocumentReference or path of the Firestore document to be deleted
 * @returns a map that contains the delete date and a function with which the deleted document can be compared with another one,
 * null in case of error
 */
async function DeleteDocument(id: DataID) {
    try {
        const db = getFirestore();
        let documentRefernce: DocumentReference;
        if (id instanceof DocumentReference) {
            documentRefernce = id;
        } else {
            documentRefernce = db.doc(id);
        }
        const updateResult = await documentRefernce.delete();
        return { timestamp: updateResult.writeTime, compare: (w: WriteResult) => updateResult.isEqual(w) };
    } catch (e: any) {
        logger.error(e.message);
        return null;
    }
}

/**
 * set a firestore document
 * @param id DocumentReference or path of the Firestore document to be updated
 * @param data map that contains the new data for the document
 * @param merge optional, default value is true, this ensures that the document is not completely overwritten but merged, 
 * false would overwrite the entire document
 * @returns a map that contains the write date and a function with which the updated document can be compared with another one,
 * null in case of error
 */
async function UpsertDocument(id: DataID, data: { [id: string]: any }, merge: boolean = true) {
    try {
        const db = getFirestore();
        let documentRefernce: DocumentReference;
        if (id instanceof DocumentReference) {
            documentRefernce = id;
        } else {
            documentRefernce = db.doc(id);
        }
        const updateResult = await documentRefernce.set(data, { merge: merge });
        return { timestamp: updateResult.writeTime, compare: (w: WriteResult) => updateResult.isEqual(w) };
    } catch (e: any) {
        logger.error(e.message);
        return null;
    }
}

/**
 * create a firestore document
 * @param id DocumentReference or path of the Firestore document to be updated
 * @param data map that contains the new data for the document
 * @returns a map that contains the create date and a function with which the updated document can be compared with another one,
 * null in case of error
 */
async function CreateDocument(id: DataID, data: { [id: string]: any }) {
    try {
        const db = getFirestore();
        let documentRefernce: DocumentReference;
        if (id instanceof DocumentReference) {
            documentRefernce = id;
        } else {
            documentRefernce = db.doc(id);
        }
        const createResult = await documentRefernce.create({createdAt : createTimestamp(), ...data});
        return { timestamp: createResult.writeTime, compare: (w: WriteResult) => createResult.isEqual(w) };
    } catch (e: any) {
        logger.error(e.message);
        return null;
    }
}

export { UpdateDocument, DeleteDocument, GetDocument, UpsertDocument, GetManyDocuments, CreateDocument };
