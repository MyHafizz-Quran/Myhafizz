import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CaretLeft, ArrowLeft } from "@phosphor-icons/react";
import usePlatform from "@/hooks/usePlatform";

function useScrolled(px = 24) {
  const [s, setS] = useState(false);
  useEffect(() => {
    const on = () => setS(window.scrollY > px);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [px]);
  return s;
}

/**
 * En-tête de page natif.
 * iOS : barre fine en verre (bouton retour rond, titre centré qui apparaît au défilement) + grand titre.
 * Android : barre d'app Material 3 (flèche retour, titre à gauche), teintée au défilement.
 * back : chemin, true (= page précédente) ou rien (onglet principal).
 */
export default function PageHeader({ title, subtitle, back, right, className = "" }) {
  const platform = usePlatform();
  const navigate = useNavigate();
  const scrolled = useScrolled();
  const goBack = () => (typeof back === "string" ? navigate(back) : window.history.length > 1 ? navigate(-1) : navigate("/Dashboard"));

  if (platform === "android") {
    return (
      <>
        <header className={`sticky top-0 z-30 -mx-4 px-1 transition-colors lg:hidden ${scrolled ? "bg-[hsl(var(--accent))]" : "bg-background"}`} style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
          <div className="h-16 flex items-center gap-1">
            {back ? (
              <button onClick={goBack} aria-label="Retour" className="w-12 h-12 rounded-full flex items-center justify-center active:bg-black/10 dark:active:bg-white/10"><ArrowLeft size={24} weight="bold" /></button>
            ) : <span className="w-3" />}
            <h1 className="flex-1 min-w-0 truncate text-[22px] font-extrabold">{title}</h1>
            {right && <div className="flex items-center gap-1 pr-2">{right}</div>}
          </div>
        </header>
        <DesktopTitle title={title} />
        {subtitle && <p className={`text-sm font-semibold text-muted-foreground mt-0.5 lg:mt-1 ${className}`}>{subtitle}</p>}
      </>
    );
  }

  return (
    <>
      <header className={`sticky top-0 z-30 -mx-4 px-4 transition-[background-color,border-color] lg:hidden border-b ${scrolled ? "bg-background border-border" : "bg-background border-transparent"}`} style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        <div className="h-[52px] flex items-center gap-2">
          <div className="w-[88px] flex">
            {back && <button onClick={goBack} aria-label="Retour" className="bg-card border-2 border-border w-10 h-10 rounded-full flex items-center justify-center press"><CaretLeft size={22} weight="bold" /></button>}
          </div>
          <p className={`flex-1 min-w-0 text-center truncate text-[17px] font-extrabold transition-opacity ${scrolled ? "opacity-100" : "opacity-0"}`}>{title}</p>
          <div className="w-[88px] flex justify-end items-center gap-2">{right}</div>
        </div>
      </header>
      <h1 className="text-[32px] leading-[1.15] font-black tracking-tight mt-1 lg:mt-8">{title}</h1>
      {subtitle && <p className={`text-sm font-semibold text-muted-foreground mt-1 ${className}`}>{subtitle}</p>}
    </>
  );
}

function DesktopTitle({ title }) {
  return <h1 className="hidden lg:block text-[32px] leading-[1.15] font-black tracking-tight mt-8">{title}</h1>;
}
