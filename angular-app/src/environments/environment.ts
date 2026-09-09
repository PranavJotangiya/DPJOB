/**
 * Development. `ng serve` proxies /api to the Node server on :8080 — see
 * proxy.conf.json — so a relative URL works and there is no CORS in dev.
 */
export const environment = {
  production: false,
  apiUrl: '/api',
};
