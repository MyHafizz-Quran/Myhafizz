import React from "react";

/** Logo MyHafizz « Mihrab et livre » : arche de mihrab, Coran ouvert découpé dans la base, posée sur sa lèvre. */
export default function MhLogo({ size = 32, color = "#00A3A8", lip = "#007C80", withLip = true, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" className={className} aria-hidden="true">
      {withLip && <path fill={lip} d="M48 236V136c0-46 36-74 80-96 44 22 80 50 80 96v100z" />}
      <path fill={color} fillRule="evenodd" d="M48 222V122c0-46 36-74 80-96 44 22 80 50 80 96v100z M80 160q24-14 48 6 24-20 48-6v34q-24-12-48 8-24-20-48-8z" />
    </svg>
  );
}

export function MhWordmark({ size = 28, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <MhLogo size={size} />
      <span className="font-black tracking-tight text-foreground" style={{ fontSize: size * 0.72 }}>MyHafizz</span>
    </span>
  );
}
