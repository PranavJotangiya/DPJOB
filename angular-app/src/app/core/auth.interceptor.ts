import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { TokenStore } from './token.store';

/**
 * Attaches the login token to every API call, and drops the stored session if
 * the server ever says it is no longer good (deleted user, deactivated account,
 * expired or rotated token) — which sends the app back to the login screen.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(TokenStore);
  const token = tokens.token();

  const authed = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authed).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && tokens.token()) {
        tokens.clear();
      }
      return throwError(() => err);
    }),
  );
};
