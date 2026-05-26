import React from "react";

export default function TopHeader() {
  return (
<<<<<<< HEAD
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
=======
    <header
      className="fixed top-0 left-0 right-0 z-[var(--z-top-header)]"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      {/* Safe area background fill - ensures status bar area has proper background */}
      <div 
        className="absolute top-0 left-0 right-0 bg-white dark:bg-gray-950"
        style={{ height: "env(safe-area-inset-top, 0px)" }}
      />
      {/* Main header content with modern mobile styling */}
      <div className="relative bg-white/[0.97] dark:bg-gray-950/[0.97] backdrop-blur-xl border-b border-gray-200/80 dark:border-gray-800/80 shadow-sm shadow-black/[0.04] dark:shadow-none">
        <div className="h-14 flex items-center justify-between px-4 max-w-4xl mx-auto">
          {/* Logo gauche */}
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <img src="/logo.svg" alt="MyHafizz" className="w-6 h-6" />
          </div>
          {/* Titre centré */}
          <h1 className="font-bold text-base text-gray-900 dark:text-white">
            <span className="font-arabic">حافظ</span>
            <span className="ml-1.5 text-sm font-normal text-gray-500 dark:text-gray-400">MyHafizz</span>
          </h1>
          {/* Espace droite vide */}
          <div className="w-9" />
>>>>>>> 7f0356aab4c376641d3aa5b6c0c4f22b935a7fe0
        </div>
      </div>
    </header>
  );
}
