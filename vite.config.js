import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { defineConfig } from 'vite'
import path from 'path'

// https://vite.dev/config/
// Release Sentry = commit déployé (Vercel l'expose au build)
const sentryRelease = process.env.VITE_SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || "";

export default defineConfig({
  build: {
    // Source maps générées pour Sentry, puis supprimées du dossier dist après envoi
    sourcemap: process.env.SENTRY_AUTH_TOKEN ? "hidden" : false,
  },
  plugins: [
    react(),
    // Envoi des source maps à Sentry (uniquement si SENTRY_AUTH_TOKEN est défini, ex. sur Vercel)
    process.env.SENTRY_AUTH_TOKEN &&
      sentryVitePlugin({
        org: "myhafizz",
        project: "myhafizz-web",
        url: "https://de.sentry.io/",
        authToken: process.env.SENTRY_AUTH_TOKEN,
        release: sentryRelease ? { name: sentryRelease } : undefined,
        sourcemaps: { filesToDeleteAfterUpload: ["./dist/**/*.map"] },
        telemetry: false,
      }),
  ].filter(Boolean),
  define: {
    "import.meta.env.VITE_SENTRY_RELEASE": JSON.stringify(sentryRelease),
    "import.meta.env.VITE_SENTRY_ENVIRONMENT": JSON.stringify(process.env.VITE_SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || ""),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});