import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MemorizationProgress } from "@/api/entities";
import {
  getPendingSyncActions,
  clearPendingSyncActions,
} from "@/lib/offlineStorage";
import { useOnlineStatus } from "./useOnlineStatus";
import { useToast } from "@/components/ui/use-toast";

export function useOfflineSync() {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Keep pendingCount up-to-date
  useEffect(() => {
    getPendingSyncActions().then(actions => setPendingCount(actions.length));
  }, [isOnline]);

  const syncNow = useCallback(async () => {
    if (isSyncing) return;
    const actions = await getPendingSyncActions();
    if (actions.length === 0) return;

    setIsSyncing(true);
    try {
      // Process each pending action in order
      for (const action of actions) {
        if (action.type === "upsert-progress") {
          const { currentProgressId, data } = action.payload;
          if (currentProgressId) {
            await MemorizationProgress.update(currentProgressId, data);
          } else {
            await MemorizationProgress.create(data);
          }
        }
      }
      await clearPendingSyncActions();
      setPendingCount(0);
      // Refresh server data
      await queryClient.invalidateQueries({ queryKey: ["memorization-progress"] });
    } catch {
      // Leave actions in the queue to retry later
      toast({
        title: "Synchronisation échouée",
        description: "Vos modifications seront synchronisées à la prochaine connexion.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, queryClient, toast]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (wasOffline && isOnline) {
      syncNow();
    }
  }, [wasOffline, isOnline, syncNow]);

  return { isSyncing, pendingCount, syncNow };
}
