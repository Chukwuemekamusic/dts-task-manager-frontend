import { Application } from 'express';

const healthcheck = require('@hmcts/nodejs-healthcheck');

/**
 * Exposes GET /health (and /health/liveness, /health/readiness) so the platform
 * can monitor the app. Readiness flips to DOWN during graceful shutdown.
 */
export default function (app: Application): void {
  healthcheck.addTo(app, {
    checks: {},
    readinessChecks: {
      shutdownCheck: healthcheck.raw(() => (app.locals.shutdown ? healthcheck.down() : healthcheck.up())),
    },
  });
}
