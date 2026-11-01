import { useQuery } from "@tanstack/react-query";
import { db } from "@/api/neonClient";

/** Transforme un lien YouTube (vidéo, /live/, youtu.be, chaîne UC…) en adresse d'intégration. */
export function ytEmbed(url, { muted = true } = {}) {
  const u = String(url || "").trim();
  if (!u) return null;
  const q = `autoplay=1&mute=${muted ? 1 : 0}&playsinline=1&rel=0&modestbranding=1`;
  let m = u.match(/(?:v=|youtu\.be\/|\/live\/|\/embed\/)([A-Za-z0-9_-]{11})/);
  if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}?${q}`;
  m = u.match(/\/channel\/(UC[A-Za-z0-9_-]{22})/);
  if (m) return `https://www.youtube.com/embed/live_stream?channel=${m[1]}&${q}`;
  return null;
}

/** Réglage global « live » (admin) : { enabled, mecque, medine }. */
export function useLive() {
  const { data } = useQuery({
    queryKey: ["live-setting"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await db.from("game_settings").select("value").eq("key", "live").maybeSingle();
      return data?.value || null;
    },
  });
  const v = data || {};
  const sources = [
    { key: "mecque", label: "La Mecque", place: "Masjid al-Haram", url: ytEmbed(v.mecque) },
    { key: "medine", label: "Médine", place: "Masjid an-Nabawi", url: ytEmbed(v.medine) },
  ].filter((s) => s.url);
  return { on: v.enabled !== false && sources.length > 0, sources };
}
