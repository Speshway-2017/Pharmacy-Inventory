import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let messagingService: admin.messaging.Messaging | null = null;

try {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey && !privateKey.includes('YOUR_FIREBASE_PRIVATE_KEY')) {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }
    messagingService = admin.messaging();
    console.log('🟢 Firebase Cloud Messaging initialized successfully.');
  } else {
    console.log('ℹ️ FCM credentials not provided or placeholder used. Firebase Messaging in Mock/Local mode.');
  }
} catch (error: any) {
  console.warn('⚠️ Firebase Admin initialization error:', error.message);
  console.log('🔄 Core application will operate normally without FCM.');
}

export const sendNotification = async (title: string, body: string, topic: string = 'pharmacy_alerts') => {
  if (!messagingService) {
    console.log(`[FCM Mock Notification] Topic: ${topic} | Title: ${title} | Body: ${body}`);
    return { success: true, mock: true };
  }

  try {
    const message = {
      notification: { title, body },
      topic,
    };
    const response = await messagingService.send(message);
    console.log('🟢 FCM notification sent successfully:', response);
    return { success: true, response };
  } catch (err: any) {
    console.error('❌ Failed to send FCM notification:', err.message);
    return { success: false, error: err.message };
  }
};
