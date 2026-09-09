/**
 * Production. The Node server (server/) is deployed on Render — see render.yaml.
 * If Render assigns a different URL than "dp-job-api.onrender.com", change the
 * host below and re-run `npm run deploy:hosting`.
 *
 * The origin the app is served from (https://dp-creation-f3d30.web.app) must be
 * listed in the server's CORS_ORIGINS.
 */
export const environment = {
  production: true,
  apiUrl: 'https://dp-job-api.onrender.com/api',
};
