// Neon Function « pseudo » : indique si un nom d'utilisateur est libre, avant la création du compte.
// Le rôle pseudo_check ne peut exécuter que public.username_available (aucun accès aux tables).
import pg from "pg";

const ORIGINS = ["https://myhafizz.com", "https://www.myhafizz.com", "https://myhafizz.vercel.app", "http://localhost:5173"];
const pool = new pg.Pool({ connectionString: process.env.PSEUDO_DATABASE_URL, max: 2 });

const cors = (origin) => ({
  "Access-Control-Allow-Origin": ORIGINS.includes(origin) ? origin : ORIGINS[0],
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Vary": "Origin",
});

export default {
  async fetch(request) {
    const h = cors(request.headers.get("origin") || "");
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
    const u = (new URL(request.url).searchParams.get("u") || "").trim().toLowerCase();
    if (!/^[a-z0-9_.]{3,20}$/.test(u)) return Response.json({ available: false, reason: "format" }, { headers: h });
    try {
      const { rows } = await pool.query("select public.username_available($1) as a", [u]);
      return Response.json({ available: rows[0].a === true }, { headers: { ...h, "Cache-Control": "no-store" } });
    } catch (e) {
      console.error("pseudo", e.message);
      return Response.json({ error: "indisponible" }, { status: 503, headers: h });
    }
  },
};
