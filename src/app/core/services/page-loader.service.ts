import { Injectable } from '@angular/core';

/**
 * Controls the full-screen NIZ TECH preloader declared statically in index.html
 * (#niz-loader). It's static so it covers the screen before Angular boots.
 *
 * Usage per page mount:
 *   const session = loader.begin();
 *   session.track(promise) ... (any number of times)
 *   await session.finish();   // fills the bar, fades out, resolves when content may animate
 */
export interface LoaderSession {
  track<T>(p: Promise<T>): Promise<T>;
  finish(): Promise<void>;
  cancel(): void;
}

const SHOW_DELAY_MS = 150; // on client-side navigation, skip the loader when everything is already cached
const FILL_HOLD_MS = 280; // time the bar stays at 100% before fading
const FADE_MS = 550; // must match the CSS transition in index.html

@Injectable({ providedIn: 'root' })
export class PageLoaderService {
  private sessionId = 0;
  private showTimer: ReturnType<typeof setTimeout> | null = null;

  private get root(): HTMLElement | null {
    return document.getElementById('niz-loader');
  }

  private get bar(): HTMLElement | null {
    return document.getElementById('niz-loader-bar');
  }

  private isVisible(): boolean {
    const el = this.root;
    return !!el && !el.classList.contains('niz-loader--hidden');
  }

  private setProgress(ratio: number): void {
    const bar = this.bar;
    if (bar) bar.style.transform = `scaleX(${Math.max(0, Math.min(1, ratio))})`;
  }

  private show(): void {
    const el = this.root;
    if (!el) return;
    el.style.display = '';
    // force reflow so the fade-in transition applies
    void el.offsetWidth;
    el.classList.remove('niz-loader--hidden');
    document.documentElement.classList.add('niz-loading');
  }

  private hide(): Promise<void> {
    const el = this.root;
    document.documentElement.classList.remove('niz-loading');
    if (!el) return Promise.resolve();
    el.classList.add('niz-loader--hidden');
    return new Promise((resolve) =>
      setTimeout(() => {
        if (el.classList.contains('niz-loader--hidden')) el.style.display = 'none';
        resolve();
      }, FADE_MS)
    );
  }

  begin(): LoaderSession {
    const id = ++this.sessionId;
    if (this.showTimer) clearTimeout(this.showTimer);
    this.showTimer = null;

    const wasVisible = this.isVisible();
    let total = 0;
    let done = 0;
    // Small head start so the bar never looks frozen at 0.
    const base = 0.08;
    const update = () => {
      if (id !== this.sessionId) return;
      const ratio = total === 0 ? base : base + (1 - base) * (done / total) * 0.95;
      this.setProgress(ratio);
    };

    if (!wasVisible) {
      this.setProgress(0);
      this.showTimer = setTimeout(() => {
        this.showTimer = null;
        if (id === this.sessionId) {
          this.show();
          update();
        }
      }, SHOW_DELAY_MS);
    } else {
      update();
    }

    return {
      track: <T>(p: Promise<T>): Promise<T> => {
        total++;
        update();
        const settle = () => {
          done++;
          update();
        };
        p.then(settle, settle);
        return p;
      },
      finish: async () => {
        if (id !== this.sessionId) return;
        if (this.showTimer) {
          // loaded before the loader even appeared: skip it entirely
          clearTimeout(this.showTimer);
          this.showTimer = null;
          return;
        }
        if (!this.isVisible()) return;
        this.setProgress(1);
        await new Promise((r) => setTimeout(r, FILL_HOLD_MS));
        if (id !== this.sessionId) return;
        // Resolve as the fade starts so the page animations play while the curtain lifts.
        void this.hide();
        await new Promise((r) => setTimeout(r, 120));
      },
      cancel: () => {
        if (id === this.sessionId && this.showTimer) {
          clearTimeout(this.showTimer);
          this.showTimer = null;
        }
      },
    };
  }
}
