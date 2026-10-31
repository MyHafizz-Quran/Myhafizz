import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Circle, CaretRight } from "@phosphor-icons/react";
import { isJumuaTime, kahfRead, setKahfRead } from "@/lib/weekly";
import { haptic } from "@/hooks/usePlatform";

/** Veille et jour de Jumu'a : bilan de la semaine et lecture de la sourate Al-Kahf. */
export default function FridayCard({ className = "", learned = 0, active = 0 }) {
  const navigate = useNavigate();
  const [read, setRead] = useState(() => kahfRead());
  if (!isJumuaTime()) return null;
  const friday = new Date().getDay() === 5;
  const toggle = () => { haptic(); setKahfRead(!read); setRead(!read); };

  return (
    <div className={`card-flat ${className}`}>
      <button onClick={() => { haptic(); navigate("/Bilan"); }} className="w-full flex items-center gap-3 p-4 text-left active:bg-muted rounded-t-2xl">
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-extrabold uppercase tracking-wide text-primary">{friday ? "Jumu'a Moubaraka" : "Demain, c'est Jumu'a"}</p>
          <p className="font-black text-[17px] mt-0.5">Ton bilan de la semaine</p>
          <p className="text-[13px] font-semibold text-muted-foreground mt-0.5">
            {learned} verset{learned > 1 ? "s" : ""} appris · {active} jour{active > 1 ? "s" : ""} sur 7
          </p>
        </div>
        <CaretRight weight="bold" className="w-5 h-5 text-muted-foreground shrink-0" />
      </button>
      <div className="border-t-2 border-border flex items-center gap-3 p-3 pl-4">
        <button onClick={toggle} aria-pressed={read} aria-label={read ? "Al-Kahf lue" : "Marquer Al-Kahf comme lue"} className="shrink-0">
          {read ? <CheckCircle weight="fill" className="w-7 h-7 text-primary" /> : <Circle weight="bold" className="w-7 h-7 text-muted-foreground" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-extrabold">Sourate Al-Kahf</p>
          <p className="text-[12.5px] font-semibold text-muted-foreground">{read ? "Lue cette semaine" : friday ? "À lire aujourd'hui" : "À lire dès ce soir, après Maghrib"}</p>
        </div>
        <button onClick={() => { haptic(); navigate("/Memorize?surah=18"); }} className="btn-relief h-10 px-4 bg-primary text-primary-foreground text-sm shrink-0">Lire</button>
      </div>
    </div>
  );
}
