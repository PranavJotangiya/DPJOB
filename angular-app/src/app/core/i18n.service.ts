import { Injectable, computed, signal } from '@angular/core';
import type { LangCode } from './models';
import { LANGUAGES, makeT } from './i18n.data';

const STORAGE_KEY = 'dpc-lang';

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly languages = LANGUAGES;

  readonly lang = signal<LangCode>(this.readStored());

  /** Reactive translate function — call as `i18n.t()('nav.dashboard')` in code,
   *  or use the `t` pipe in templates: `{{ 'nav.dashboard' | t }}`. */
  readonly t = computed(() => makeT(this.lang()));

  constructor() {
    this.applyDocumentLang(this.lang());
  }

  setLang(next: LangCode): void {
    this.lang.set(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore (private browsing, etc.) */
    }
    this.applyDocumentLang(next);
  }

  private readStored(): LangCode {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'hi' || stored === 'gu') return stored;
    } catch {
      /* ignore */
    }
    return 'en';
  }

  private applyDocumentLang(lang: LangCode): void {
    if (typeof document !== 'undefined') document.documentElement.lang = lang;
  }
}
