/**
 * MyHafizz · icônes Phosphor (Bold par défaut, Fill pour les états actifs).
 * Couche de compatibilité : garde les noms Lucide utilisés dans le code,
 * mais rend des icônes Phosphor. Props : size, className, weight, fill, color.
 * Passer weight="fill" (ou fill="currentColor") pour la version pleine.
 */
import React from "react";
import {
  ArrowLeft as PhArrowLeft,
  ArrowRight as PhArrowRight,
  CaretDown as PhCaretDown,
  CheckCircle as PhCheckCircle,
  Circle as PhCircle,
  CircleNotch as PhCircleNotch,
  Eye as PhEye,
  EyeSlash as PhEyeSlash,
  Heart as PhHeart,
  Lock as PhLock,
  Microphone as PhMicrophone,
  Palette as PhPalette,
  Pause as PhPause,
  Play as PhPlay,
  Repeat as PhRepeat,
  WifiHigh as PhWifiHigh,
  WifiSlash as PhWifiSlash,
  XCircle as PhXCircle
} from "@phosphor-icons/react";

function wrap(PIcon, name) {
  const C = React.forwardRef(function MhIcon({ size = 24, weight, fill, strokeWidth: _sw, absoluteStrokeWidth: _asw, color, ...rest }, ref) {
    const w = weight || (fill && fill !== "none" ? "fill" : "bold");
    return <PIcon ref={ref} size={size} weight={w} color={color || "currentColor"} {...rest} />;
  });
  C.displayName = name;
  return C;
}

export const ArrowLeft = wrap(PhArrowLeft, "ArrowLeft");
export const ArrowRight = wrap(PhArrowRight, "ArrowRight");
export const CheckCircle2 = wrap(PhCheckCircle, "CheckCircle2");
export const ChevronDown = wrap(PhCaretDown, "ChevronDown");
export const Circle = wrap(PhCircle, "Circle");
export const Eye = wrap(PhEye, "Eye");
export const EyeOff = wrap(PhEyeSlash, "EyeOff");
export const Heart = wrap(PhHeart, "Heart");
export const Loader2 = wrap(PhCircleNotch, "Loader2");
export const Lock = wrap(PhLock, "Lock");
export const Mic = wrap(PhMicrophone, "Mic");
export const Palette = wrap(PhPalette, "Palette");
export const Pause = wrap(PhPause, "Pause");
export const Play = wrap(PhPlay, "Play");
export const Repeat = wrap(PhRepeat, "Repeat");
export const Wifi = wrap(PhWifiHigh, "Wifi");
export const WifiOff = wrap(PhWifiSlash, "WifiOff");
export const XCircle = wrap(PhXCircle, "XCircle");
