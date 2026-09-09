import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { TokenStore } from './token.store';

export interface LiveStream {
  close(): void;
}

/**
 * The single door to the Node server (server/). Nothing in the app talks to
 * Firebase any more — reads and writes go over HTTP, and live updates arrive on
 * a Server-Sent Events stream the server feeds from its own Firestore listener.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private tokens = inject(TokenStore);

  readonly baseUrl = environment.apiUrl;

  get<T>(path: string): Promise<T> {
    return firstValueFrom(this.http.get<T>(this.url(path)));
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.post<T>(this.url(path), body));
  }

  put<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.put<T>(this.url(path), body));
  }

  patch<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.patch<T>(this.url(path), body));
  }

  delete(path: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(this.url(path)));
  }

  /**
   * Opens an SSE stream and keeps it open for the caller's lifetime.
   * EventSource cannot send headers, so the token rides along as a query
   * param — the server accepts it from either place.
   */
  stream<T>(path: string, onData: (rows: T[]) => void, onError: () => void): LiveStream {
    const token = this.tokens.token();
    const source = new EventSource(`${this.url(path)}?token=${encodeURIComponent(token)}`);

    source.addEventListener('data', (event) => {
      try {
        onData(JSON.parse((event as MessageEvent<string>).data) as T[]);
      } catch {
        onError();
      }
    });
    source.addEventListener('stream-error', () => onError());
    // Fires on a dropped connection too; EventSource reconnects on its own and
    // the server replays the current rows, so this only drives the offline flag.
    source.onerror = () => onError();

    return { close: () => source.close() };
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }
}

/** The server's `{ error }` message, or a sensible fallback. */
export function apiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error as { error?: string } | null;
    if (body?.error) return body.error;
    if (err.status === 0) return 'Cannot reach the server';
  }
  return fallback;
}
