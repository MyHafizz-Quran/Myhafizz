import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { get, set, del } from 'idb-keyval';
import { report } from '@/lib/report';

// Aucune erreur affichée : les requêtes en échec sont signalées à Sentry et relancées en silence.
export const queryClientInstance = new QueryClient({
	queryCache: new QueryCache({ onError: (e, q) => report(e, `query:${JSON.stringify(q.queryKey).slice(0, 80)}`) }),
	mutationCache: new MutationCache({ onError: (e, _v, _c, m) => report(e, `mutation:${JSON.stringify(m.options.mutationKey || '').slice(0, 80)}`) }),
	defaultOptions: {
		queries: {
			// Fluidité : un écran déjà vu s'affiche tout de suite avec ses données, puis se met à jour en silence.
			staleTime: 30 * 1000,
			gcTime: 24 * 60 * 60 * 1000,
			refetchOnWindowFocus: false,
			retry: 3,
			retryDelay: (n) => Math.min(1000 * 2 ** n, 8000),
			// Toujours en échec après les essais : nouvel essai toutes les 15 s tant que l'écran est ouvert
			refetchInterval: (q) => (q.state.status === 'error' ? 15000 : false),
		},
	},
});

// Données gardées sur le téléphone (IndexedDB) : à la réouverture de l'app, tout s'affiche sans attendre le réseau.
const KEY = 'mh-query-cache';
export const queryPersister = createAsyncStoragePersister({
	storage: { getItem: (k) => get(k), setItem: (k, v) => set(k, v), removeItem: (k) => del(k) },
	key: KEY,
	throttleTime: 2000,
});
export const persistOptions = {
	persister: queryPersister,
	maxAge: 24 * 60 * 60 * 1000,
	buster: import.meta.env.VITE_SENTRY_RELEASE || 'dev',
	dehydrateOptions: {
		// Seulement les lectures réussies, hors temps réel (duels en direct, présence, notifications)
		shouldDehydrateQuery: (q) => q.state.status === 'success' && !/live|presence|duel|notif|tournoi-live|partie/i.test(JSON.stringify(q.queryKey)),
	},
};

/** À la déconnexion : rien ne doit rester du compte précédent. */
export async function clearQueryCache() {
	queryClientInstance.clear();
	try { await del(KEY); } catch { /* silencieux */ }
}
