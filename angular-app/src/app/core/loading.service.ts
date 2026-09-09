import { Injectable, signal } from '@angular/core';

/** Wait this long before showing anything — a fast save should not flash. */
const SHOW_AFTER_MS = 250;
/** Once shown, stay up at least this long so it never blinks in and out. */
const MIN_VISIBLE_MS = 500;

/**
 * Counts in-flight API requests so the app can show one loader for all of them.
 *
 * Only HttpClient calls are counted (see loading.interceptor.ts) — the SSE
 * streams are long-lived by design and would otherwise pin the loader on
 * screen forever.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  /** True when the loader should be on screen. */
  readonly visible = signal(false);

  private pending = 0;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private shownAt = 0;

  start(): void {
    this.pending += 1;
    if (this.pending > 1) return;

    // A request that finishes inside SHOW_AFTER_MS never shows a loader at all.
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    if (this.visible() || this.showTimer) return;

    this.showTimer = setTimeout(() => {
      this.showTimer = null;
      this.shownAt = Date.now();
      this.visible.set(true);
    }, SHOW_AFTER_MS);
  }

  stop(): void {
    this.pending = Math.max(0, this.pending - 1);
    if (this.pending > 0) return;

    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
    if (!this.visible()) return;

    const shownFor = Date.now() - this.shownAt;
    const wait = Math.max(0, MIN_VISIBLE_MS - shownFor);
    this.hideTimer = setTimeout(() => {
      this.hideTimer = null;
      // A new request may have started while we were waiting out the minimum.
      if (this.pending === 0) this.visible.set(false);
    }, wait);
  }
}
