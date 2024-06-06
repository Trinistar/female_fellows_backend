import { Timestamp } from "firebase-admin/firestore";

interface FieldDescriptor {
    name: string;
    fields: (string | FieldDescriptor)[];
}

// Helper to check if a field of an object had changed between the before and after version
export function didFieldChange(before: any, after: any, field: string | FieldDescriptor): boolean {
    if (before === null || after === null) {
        return before !== after;
    }
    if (typeof field === 'string') {
        if (before[field] instanceof Timestamp && after[field] instanceof Timestamp) {
            return !(before[field] as Timestamp).isEqual(after[field]);
        }

        return before[field] !== after[field];
    } else {
        const beforeField = before[field.name];
        const afterField = after[field.name];

        if (typeof beforeField !== typeof afterField) {
            return true;
        }

        if ((beforeField === null && afterField !== null) || (beforeField !== null && afterField === null)) {
            return true;
        }

        if (typeof beforeField !== 'object') {
            return beforeField !== afterField;
        }

        return didFieldsChange(beforeField, afterField, field.fields);
    }
}

// Helper to check if any of the fields of an object had changed between the before and after version
export function didFieldsChange(before: any, after: any, fields: (string | FieldDescriptor)[]) {
    return fields.some((field) => didFieldChange(before, after, field));
}