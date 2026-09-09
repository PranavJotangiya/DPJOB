/**
 * Production. Point this at wherever the Node server (server/) is deployed —
 * e.g. 'https://dp-api.onrender.com/api'. Keep '/api' only if the API is
 * served from the same origin as the app (a reverse proxy in front of both).
 *
 * Whatever origin you use must also be listed in the server's CORS_ORIGINS.
 */
export const environment = {
  production: true,
  apiUrl: '/api',
};
