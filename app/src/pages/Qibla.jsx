import React, { useEffect, useState } from "react";
import { NavigationArrow, MapPin } from "@phosphor-icons/react";
import PageHeader from "@/components/PageHeader";
import { getLocation, requestLocation, qiblaBearing, distanceToKaaba } from "@/lib/prayer";
import { haptic } from "@/hooks/usePlatform";

const needsPermission = () => typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function";

/** Direction de la qibla : boussole du téléphone si disponible, sinon l'angle par rapport au nord. */
export default function Qibla() {
  const [loc, setLoc] = useState(getLocation);
  const [heading, setHeading] = useState(null);
  const [state, setState] = useState(needsPermission() ? "ask" : "listening"); // ask | listening | denied
  const [geoErr, setGeoErr] = useState(false);

  useEffect(() => {
    if (state !== "listening") return;
    const onAbs = (e) => { if (e.alpha != null) setHeading((360 - e.alpha) % 360); };
    const onIOS = (e) => { if (e.webkitCompassHeading != null) setHeading(e.webkitCompassHeading); };
    const abs = "ondeviceorientationabsolute" in window;
    if (abs) window.addEventListener("deviceorientationabsolute", onAbs);
    else window.addEventListener("deviceorientation", onIOS);
    return () => { window.removeEventListener("deviceorientationabsolute", onAbs); window.removeEventListener("deviceorientation", onIOS); };
  }, [state]);

  const askCompass = async () => {
    haptic();
    try { setState((await DeviceOrientationEvent.requestPermission()) === "granted" ? "listening" : "denied"); } catch { setState("denied"); }
  };
  const locate = async () => { haptic(); setGeoErr(false); try { setLoc(await requestLocation()); } catch { setGeoErr(true); } };

  const bearing = loc ? qiblaBearing(loc) : null;
  const rot = bearing == null ? 0 : heading == null ? bearing : (bearing - heading + 360) % 360;
  const aligned = heading != null && (rot < 5 || rot > 355);

  return (
    <div className="min-h-[100dvh] bg-background pb-nav">
      <div className="px-4"><PageHeader title="Qibla" back="/Dashboard" /></div>
      <div className="max-w-md mx-auto px-4 pt-4">
        {!loc ? (
          <div className="card-flat p-5 text-center">
            <MapPin weight="fill" className="w-9 h-9 text-primary mx-auto mb-2" />
            <p className="font-black text-lg">Ta position est nécessaire</p>
            <p className="text-sm font-semibold text-muted-foreground mb-4">{geoErr ? "Localisation refusée. Autorise-la dans les réglages du navigateur." : "Elle sert uniquement à calculer la direction de La Mecque, et reste sur ton téléphone."}</p>
            <button onClick={locate} className="btn-relief w-full h-[50px] bg-primary text-primary-foreground">Activer la localisation</button>
          </div>
        ) : (
          <>
            <div className="card-flat p-6 flex flex-col items-center">
              <div className={`relative w-64 h-64 rounded-full border-[6px] ${aligned ? "border-primary" : "border-border"} bg-card flex items-center justify-center transition-colors`}>
                {heading != null && (
                  <span className="absolute top-2 left-1/2 -translate-x-1/2 text-xs font-black text-muted-foreground" style={{ transform: `translateX(-50%) rotate(${-heading}deg)`, transformOrigin: "50% 120px" }}>N</span>
                )}
                <div className="transition-transform duration-200 ease-out" style={{ transform: `rotate(${rot}deg)` }}>
                  <NavigationArrow weight="fill" className="w-28 h-28 text-primary rotate-45" />
                </div>
              </div>
              <p className="font-black text-[22px] mt-5">{aligned ? "Tu es face à la qibla" : `${Math.round(bearing)}° depuis le nord`}</p>
              <p className="text-sm font-semibold text-muted-foreground">La Mecque à {distanceToKaaba(loc).toLocaleString("fr-FR")} km</p>
            </div>

            {state === "ask" && (
              <button onClick={askCompass} className="btn-relief w-full h-[50px] mt-3 bg-primary text-primary-foreground">Activer la boussole</button>
            )}
            <p className="text-[12.5px] font-semibold text-muted-foreground mt-3 px-1">
              {state === "denied" ? "Boussole refusée : la flèche indique l'angle par rapport au nord. Tourne-toi vers le nord, puis suis l'angle."
                : heading == null ? "Si la flèche ne bouge pas, ton appareil n'a pas de boussole : elle indique l'angle par rapport au nord."
                : "Tiens le téléphone à plat, loin des objets métalliques. Le cercle devient turquoise quand tu es aligné."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
