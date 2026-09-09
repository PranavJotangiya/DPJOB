import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { loadingInterceptor } from './core/loading.interceptor';
import { provideServiceWorker } from '@angular/service-worker';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // The design system asks for a 0.25s cross-fade between screens; the
    // timing itself lives in styles.css under ::view-transition-*.
    provideRouter(routes, withViewTransitions()),
    // Every call to the Node API goes through authInterceptor, which attaches
    // the login token and signs the user out when the server rejects it, and
    // loadingInterceptor, which drives the garment loader.
    provideHttpClient(withInterceptors([loadingInterceptor, authInterceptor])),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
