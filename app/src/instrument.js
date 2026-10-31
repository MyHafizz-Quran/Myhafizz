// Sentry : doit être importé avant tout le reste (voir src/main.jsx)
import { useEffect } from "react";
import {
  useLocation,
  useNavigationType,
  createRoutesFromChildren,
  matchRoutes,
} from "react-router-dom";
import * as Sentry from "@sentry/react";

const isProd = import.meta.env.PROD;

Sentry.init({
  // Le DSN est public (il finit dans le bundle) ; VITE_SENTRY_DSN permet de le surcharger.
  dsn: import.meta.env.VITE_SENTRY_DSN || "https://ea3adaac1e06e68bf495fa602f375d2a@o4512346558824448.ingest.de.sentry.io/4512347635843152",
  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
  release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
  sendDefaultPii: false,
  integrations: [
    // Traces de navigation et de chargement, avec les routes React Router v6
    Sentry.reactRouterV6BrowserTracingIntegration({
      useEffect,
      useLocation,
      useNavigationType,
      createRoutesFromChildren,
      matchRoutes,
    }),
  ],
  // 100 % en dev, 20 % en production
  tracesSampleRate: isProd ? 0.2 : 1.0,
  // En-têtes de trace uniquement vers notre propre domaine (évite les erreurs CORS côté Neon)
  tracePropagationTargets: [/^\/(?!\/)/, /^https:\/\/(www\.)?myhafizz\.com(\/|$)/],
});

export default Sentry;
