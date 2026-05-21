import admin from 'firebase-admin'

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

export const messaging = admin.messaging()

export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      token,
    }

    const response = await messaging.send(message)
    console.log('Successfully sent message:', response)
    return { success: true, messageId: response }
  } catch (error) {
    console.error('Error sending message:', error)
    return { success: false, error }
  }
}