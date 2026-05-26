import React from "react";

export default function TopHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-[var(--z-top-header)] bg-surface flex justify-between items-center px-6 py-4 border-b-0 shadow-none" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}>
      <div className="flex items-center gap-4">
        <button className="text-primary hover:bg-surface-container transition-colors duration-300 p-2 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
        </button>
        <h1 className="font-headline text-xl font-bold tracking-tight text-primary">MyHafizz</h1>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden border-2 border-primary-fixed">
          <img src="https://ui-avatars.com/api/?name=MH&background=a1d1b4&color=14422d&bold=true" alt="Profile" className="w-full h-full object-cover" />
        </div>
      </div>
    </header>
  );
}
