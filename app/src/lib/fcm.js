// Firebase Cloud Messaging : rattache l'abonnement push existant (même clé VAPID, importée dans Firebase)
// à un jeton FCM, pour que les envois passent par Firebase (statistiques dans la console Firebase).
// Chargé à la demande pour ne pas alourdir le premier écran.
import { report } from "@/lib/report";

const CONFIG = {
  apiKey: "AIzaSyAtKLDS5Tqwmyr_zYEkuFHI71ALZt-h6aw",
  authDomain: "myhafizz-b2a88.firebaseapp.com",
  projectId: "myhafizz-b2a88",
  messagingSenderId: "1089971064851",
  appId: "1:1089971064851:web:ccfb4d35158152b294efe6",
};

export async function fcmToken(reg, vapidKey) {
  try {
    const [{ initializeApp, getApps }, { getMessaging, getToken, isSupported }] = await Promise.all([import("firebase/app"), import("firebase/messaging")]);
    if (!(await isSupported())) return null;
    const app = getApps()[0] || initializeApp(CONFIG);
    return await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: reg });
  } catch (e) {
    report(e, "fcm.token");
    return null;
  }
}
