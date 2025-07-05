import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://3772779849cfa6fe7772829a3d526ca2@o4509604060332032.ingest.us.sentry.io/4509604077764608",

  integrations: [
    Sentry.replayIntegration(),
  ],

tracesSampleRate: process.env.NODE_ENV === 'test' ? 1.0 : 0.1, // 10% in non-production
  replaysSessionSampleRate: process.env.NODE_ENV === 'test' ? 0.1 : 0.01, // 1% in non-production
  replaysOnErrorSampleRate: process.env.NODE_ENV === 'test' ? 1.0 : 0.1, // 10% in non-production
  debug: false,

});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;