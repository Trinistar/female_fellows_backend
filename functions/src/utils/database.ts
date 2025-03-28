import {DocumentReference, CollectionReference} from "firebase-admin/firestore";

export async function deleteDocumentRecursive(document: DocumentReference) {
    while (true) {
        const collections = await document.listCollections();
        if (collections.length <= 0) {
            break;
        }
        await Promise.all(collections.map(deleteCollectionRecursive));
    }
    return document.delete();
}

export async function deleteCollectionRecursive(collection: CollectionReference) {
    while (true) {
        const documents = await collection.listDocuments();
        if (documents.length <= 0) {
            break;
        }
        await Promise.all(documents.map(deleteDocumentRecursive));
    }
}