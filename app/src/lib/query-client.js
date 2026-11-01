import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { report } from '@/lib/report';

// Aucune erreur affichée : les requêtes en échec sont signalées à Sentry et relancées en silence.
export const queryClientInstance = new QueryClient({
	queryCache: new QueryCache({ onError: (e, q) => report(e, `query:${JSON.stringify(q.queryKey).slice(0, 80)}`) }),
	mutationCache: new MutationCache({ onError: (e, _v, _c, m) => report(e, `mutation:${JSON.stringify(m.options.mutationKey || '').slice(0, 80)}`) }),
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 3,
			retryDelay: (n) => Math.min(1000 * 2 ** n, 8000),
			// Toujours en échec après les essais : nouvel essai toutes les 15 s tant que l'écran est ouvert
			refetchInterval: (q) => (q.state.status === 'error' ? 15000 : false),
		},
	},
});
