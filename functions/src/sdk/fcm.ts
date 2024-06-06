import { getMessaging, Message } from 'firebase-admin/messaging';

async function deliverFcmNotification(message: Message, dryRun: boolean = true) {
    const messaging = getMessaging()
    if (dryRun) {
        const dryResponse = await messaging.send(message, dryRun)
        if (dryResponse) {
            return messaging.send(message)
        } else {
            return null
        }
    }
    return messaging.send(message)
}

async function deliverFcmNotifications(messages: Message[], dryRun: boolean = true) {
    const messaging = getMessaging()
    if (dryRun) {
        const response = await messaging.sendEach(messages, dryRun)
        if (response.failureCount > (messages.length * 0.7)) {
            return null
        } else {
            return messaging.sendEach(messages)
        }
    }
    return messaging.sendEach(messages)
}

export { deliverFcmNotification, deliverFcmNotifications }