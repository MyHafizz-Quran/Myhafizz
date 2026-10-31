import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi } from "@/components/icons";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function OfflineBanner() {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (wasOffline && isOnline) {
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [wasOffline, isOnline]);

  const isVisible = !isOnline || showReconnected;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key={showReconnected ? "reconnected" : "offline"}
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-2 px-4 text-sm font-semibold shadow-md ${
            showReconnected
              ? "bg-emerald-500 text-white"
              : "bg-gray-800 text-white dark:bg-gray-950"
          }`}
        >
          {showReconnected ? (
            <>
              <Wifi className="w-4 h-4 flex-shrink-0" />
              <span>Reconnecté !</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 flex-shrink-0" />
              <span>Mode hors ligne — Vos modifications seront synchronisées</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
