import { Timestamp } from "firebase-admin/firestore";

interface TimeAddition {
    seconds?: number;
    minutes?: number;
    hours?: number;
    days?: number;
}

/**
 * function that builds a timestamp in the past or present
 * @param timeAddition an object with four optional parameters, seconds, minutes, hours, or days. The values ​​in the parameters are added to or subtracted from the current timestamp.
 * @param operation Plus or minus depending on whether the times passed are to be added or subtracted in the timeAddition variable.
 * @returns a firebase timestamp in der past or present
 */
export function createTimestamp(timeAddition: TimeAddition = {}, operation: '+' | '-' = '+') {
    let seconds = 0;
    Object.keys(timeAddition).map((key) => {
        if (key === 'seconds') {
            seconds += timeAddition[key] as number;
        }
        if (key === 'minutes') {
            seconds += (timeAddition[key] as number) * 60;
        }
        if (key === 'hours') {
            seconds += (timeAddition[key] as number) * 60 * 60;
        }
        if (key === 'days') {
            seconds += (timeAddition[key] as number) * 60 * 60 * 24;
        }
    });
    if (operation.length !== 1 || (operation !== '+' && operation !== '-')) {
        return new Timestamp(Timestamp.now().seconds, 0);
    }
    if (operation === '+') {
        return new Timestamp(Timestamp.now().seconds + seconds, 0);
    }
    return new Timestamp(Timestamp.now().seconds - seconds, 0);
}
