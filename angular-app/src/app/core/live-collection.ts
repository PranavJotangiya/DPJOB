import { effect, inject, signal, type Signal } from '@angular/core';
import { ApiService, type LiveStream } from './api';
import { TokenStore } from './token.store';

export interface LiveCollection<T> {
  /** Latest rows the server pushed. */
  readonly rows: Signal<T[]>;
  /** False until the first push (or the first failure) arrives. */
  readonly ready: Signal<boolean>;
  /** True while the stream is broken — the rows on screen may be stale. */
  readonly offline: Signal<boolean>;
}

/**
 * Subscribes to one of the server's Server-Sent Event streams and keeps its
 * rows in a signal — the replacement for the Firestore `onSnapshot` listeners
 * the services used to hold.
 *
 * The stream carries the login token, so it is opened when a user signs in and
 * torn down when they sign out. Must be called from an injection context
 * (a service field initialiser).
 */
export function liveCollection<T>(
  path: string,
  options: { enabled?: () => boolean } = {},
): LiveCollection<T> {
  const api = inject(ApiService);
  const tokens = inject(TokenStore);

  const rows = signal<T[]>([]);
  const ready = signal(false);
  const offline = signal(false);
  let stream: LiveStream | null = null;

  effect((onCleanup) => {
    const token = tokens.token();
    const enabled = options.enabled ? options.enabled() : true;

    stream?.close();
    stream = null;

    if (!token || !enabled) {
      rows.set([]);
      ready.set(false);
      offline.set(false);
      return;
    }

    stream = api.stream<T>(
      path,
      (next) => {
        rows.set(next);
        ready.set(true);
        offline.set(false);
      },
      () => {
        // EventSource retries by itself; this only tells the UI the data on
        // screen may be stale in the meantime.
        ready.set(true);
        offline.set(true);
      },
    );

    onCleanup(() => {
      stream?.close();
      stream = null;
    });
  });

  return { rows: rows.asReadonly(), ready: ready.asReadonly(), offline: offline.asReadonly() };
}
