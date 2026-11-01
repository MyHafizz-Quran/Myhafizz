import React, { useState } from "react";
import { Broadcast } from "@phosphor-icons/react";
import PageHeader from "@/components/PageHeader";
import { useLive } from "@/lib/live";
import { haptic } from "@/hooks/usePlatform";

/** Direct de La Mecque et de Médine (liens officiels réglés dans l'admin). */
export default function Live() {
  const { on, sources } = useLive();
  const [k, setK] = useState(() => new URLSearchParams(location.search).get("p") || "mecque");
  const cur = sources.find((s) => s.key === k) || sources[0];
  return (
    <div className="min-h-[100dvh] bg-background pb-nav">
      <div className="max-w-xl mx-auto px-4">
        <PageHeader title="En direct" back="/Dashboard" />
        {!on || !cur ? (
          <div className="card-flat p-5 mt-4 text-center">
            <Broadcast weight="fill" className="w-9 h-9 text-primary mx-auto" />
            <p className="font-black mt-2">Le direct revient bientôt</p>
            <p className="text-sm font-semibold text-muted-foreground mt-1">La diffusion n'est pas disponible pour le moment.</p>
          </div>
        ) : (
          <>
            {sources.length > 1 && (
              <div className="flex bg-muted rounded-2xl p-1 gap-1 mt-3">
                {sources.map((s) => (
                  <button key={s.key} onClick={() => { haptic(); setK(s.key); }}
                    className={`flex-1 h-10 rounded-xl font-black text-sm ${s.key === cur.key ? "bg-card text-accent-foreground shadow-[0_2px_0_var(--border)]" : "text-muted-foreground"}`}>{s.label}</button>
                ))}
              </div>
            )}
            <div className="mt-3 rounded-2xl overflow-hidden bg-black aspect-video">
              <iframe key={cur.key} src={cur.url} title={`Direct ${cur.place}`} className="w-full h-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
            </div>
            <div className="card-flat p-4 mt-3">
              <p className="font-black">{cur.place}</p>
              <p className="text-sm font-semibold text-muted-foreground mt-0.5">Diffusion officielle via YouTube. Le son est coupé au départ : touche la vidéo pour l'activer.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
