// Neon Function « rappels » : appelée toutes les 5 minutes par un Function Trigger.
import { parseTriggerInvocation } from "@neon/functions/triggers";
import { runReminders } from "./core.mjs";

export default {
  async fetch(request) {
    const parsed = await parseTriggerInvocation(request);
    if (!parsed.ok) return new Response(parsed.error, { status: parsed.error === "invalid_body" ? 400 : 401 });
    const result = await runReminders({
      databaseUrl: process.env.REMINDER_DATABASE_URL,
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY,
      vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
    });
    console.log("rappels", JSON.stringify(result));
    return Response.json(result);
  },
};
