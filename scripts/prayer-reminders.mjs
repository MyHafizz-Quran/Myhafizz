// Secours manuel des rappels « après la prière ».
// Le passage automatique (toutes les 5 min) est assuré par la Neon Function
// « rappels » (dossier reminders/). Ce script sert uniquement en lancement manuel.
import { runReminders } from "../reminders/src/core.mjs";

const result = await runReminders({
  databaseUrl: process.env.REMINDER_DATABASE_URL,
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
});
console.log(JSON.stringify(result));
