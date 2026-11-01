import { defineConfig } from "@neon/config/v1";

// Rappels après la prière, sur le projet Neon « MyHafizz Client ».
// Déploiement : cd reminders && neon deploy --env .env.local
export default defineConfig({
  functions: {
    rappels: {
      name: "Rappels après la prière",
      source: "src/index.mjs",
      env: {
        REMINDER_DATABASE_URL: process.env.REMINDER_DATABASE_URL!,
        VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY!,
        VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY!,
      },
    },
    notif: {
      name: "Notifications push immédiates (duels)",
      source: "src/notif.mjs",
      env: {
        REMINDER_DATABASE_URL: process.env.REMINDER_DATABASE_URL!,
        VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY!,
        VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY!,
      },
    },
    pseudo: {
      name: "Nom d'utilisateur disponible",
      source: "src/pseudo.mjs",
      env: { PSEUDO_DATABASE_URL: process.env.PSEUDO_DATABASE_URL! },
    },
  },
  triggers: {
    "rappels-5min": { type: "schedule", function: "rappels", cron: "*/5 * * * *" },
  },
});
