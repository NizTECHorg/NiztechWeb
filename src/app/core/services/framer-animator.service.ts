import { Injectable, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';

export type FramerPageKey =
  | 'home'
  | 'sobre'
  | 'projects'
  | 'fluxo'
  | 'nokta'
  | 'contact'
  | 'not-found';

interface SsrPagePayload {
  key: FramerPageKey;
  hydrateV2: string;
  ssrReleasedAt: string;
  pageOptimizedAt: string;
  appearAnimationsContent: string;
  breakpoints: string;
  handoverData: string;
  html: string;
}

interface FramerMainModule {
  mountFramerPage: (hydrate: boolean, targetEl: HTMLElement) => Promise<void>;
  unmountFramerPage: () => void;
}

interface FramerGlobalAnimator {
  resetAppear?: () => void;
  animateAppearEffects: (
    appearData: Record<string, unknown>,
    callback: (
      selector: string,
      keyframesByProp: Record<string, unknown[]>,
      optionsByProp: Record<string, unknown>
    ) => void,
    attrName: string,
    transformPlaceholder: string,
    reducedMotion: boolean,
    activeVariantHash?: string
  ) => void;
  startOptimizedAppearAnimation: (
    el: Element,
    prop: string,
    keyframes: unknown[],
    options: unknown
  ) => void;
  getActiveVariantHash: (
    breakpoints: Array<{ hash: string; mediaQuery: string }>
  ) => string | undefined;
}

declare global {
  interface Window {
    animator?: FramerGlobalAnimator;
  }
}

@Injectable({
  providedIn: 'root',
})
export class FramerAnimatorService {
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);
  private readonly payloadCache = new Map<FramerPageKey, SsrPagePayload>();
  private framerModPromise: Promise<FramerMainModule> | null = null;
  private cleanupFns: Array<() => void> = [];
  private mountVersion = 0;

  initPageInteractions(rootEl: HTMLElement, explicitKey?: FramerPageKey): void {
    this.destroy();
    const version = ++this.mountVersion;
    const pageKey = explicitKey ?? this.resolvePageKeyFromUrl(window.location.pathname);

    this.ngZone.runOutsideAngular(() => {
      void this.mountFramerEngine(rootEl, pageKey, version);
    });
  }

  private resolvePageKeyFromUrl(pathname: string): FramerPageKey {
    const clean = pathname.replace(/\/+$/, '') || '/';
    if (clean === '/') return 'home';
    if (clean === '/sobre') return 'sobre';
    if (clean === '/projects') return 'projects';
    if (clean === '/projects/fluxo') return 'fluxo';
    if (clean === '/projects/nokta') return 'nokta';
    if (clean === '/contact') return 'contact';
    return 'not-found';
  }

  private async loadPayload(pageKey: FramerPageKey): Promise<SsrPagePayload> {
    const cached = this.payloadCache.get(pageKey);
    if (cached) return cached;

    const resp = await fetch(`/assets/ssr/${pageKey}.json`);
    const data = (await resp.json()) as SsrPagePayload;
    this.payloadCache.set(pageKey, data);
    return data;
  }

  private loadFramerMainModule(): Promise<FramerMainModule> {
    if (!this.framerModPromise) {
      const dynamicImport = new Function('u', 'return import(u)') as (
        url: string
      ) => Promise<FramerMainModule>;
      this.framerModPromise = dynamicImport('/assets/animate/script_main.CkCRKjyS.mjs');
    }
    return this.framerModPromise;
  }

  private upsertScriptTag(id: string, type: string, content: string): void {
    let el = document.getElementById(id) as HTMLScriptElement | null;
    if (!content) {
      el?.remove();
      return;
    }
    if (!el) {
      el = document.createElement('script');
      el.id = id;
      el.type = type;
      document.body.appendChild(el);
    }
    el.text = content;
  }

  private async mountFramerEngine(
    rootEl: HTMLElement,
    pageKey: FramerPageKey,
    version: number
  ): Promise<void> {
    const payload = await this.loadPayload(pageKey);
    if (version !== this.mountVersion) return;

    let mainEl = rootEl.querySelector<HTMLElement>('#main');
    if (!mainEl) {
      mainEl = document.createElement('div');
      mainEl.id = 'main';
      rootEl.innerHTML = '';
      rootEl.appendChild(mainEl);
    }

    // 1. Set exact SSR hydration attributes & raw HTML (preserving <!--$--> comments and [data-framer-appear-id] styles)
    mainEl.setAttribute('data-framer-hydrate-v2', payload.hydrateV2);
    if (payload.ssrReleasedAt) {
      mainEl.setAttribute('data-framer-ssr-released-at', payload.ssrReleasedAt);
    }
    if (payload.pageOptimizedAt) {
      mainEl.setAttribute('data-framer-page-optimized-at', payload.pageOptimizedAt);
    }
    mainEl.setAttribute('data-framer-generated-page', '');
    mainEl.innerHTML = payload.html;

    // 2. Inject Framer appear & CMS handover script payloads
    this.upsertScriptTag(
      '__framer__appearAnimationsContent',
      'framer/appear',
      payload.appearAnimationsContent
    );
    this.upsertScriptTag('__framer__breakpoints', 'framer/appear', payload.breakpoints);
    this.upsertScriptTag('__framer__handoverData', 'framer/handover', payload.handoverData);

    // 3. Trigger Framer's native WAAPI Spring Appear Animations synchronously BEFORE mountFramerPage sets MotionIsMounted = true
    const animator = window.animator;
    if (animator && payload.appearAnimationsContent && payload.breakpoints) {
      animator.resetAppear?.();
      try {
        const appearJson = JSON.parse(payload.appearAnimationsContent) as Record<string, unknown>;
        const bpJson = JSON.parse(payload.breakpoints) as Array<{
          hash: string;
          mediaQuery: string;
        }>;
        animator.animateAppearEffects(
          appearJson,
          (selector, keyframesByProp, optionsByProp) => {
            const target = document.querySelector(selector);
            if (target) {
              for (const [prop, kf] of Object.entries(keyframesByProp)) {
                animator.startOptimizedAppearAnimation(target, prop, kf, optionsByProp[prop]);
              }
            }
          },
          'data-framer-appear-id',
          '__Appear_Animation_Transform__',
          false,
          animator.getActiveVariantHash(bpJson)
        );
      } catch (err) {
        console.warn('Appear animation init warning:', err);
      }
    }

    // 4. Mount / Hydrate the 100% original Framer Motion runtime
    const mod = await this.loadFramerMainModule();
    if (version !== this.mountVersion) return;
    await mod.mountFramerPage(true, mainEl);

    // 5. Intercept internal route links in capture phase so Angular's Router stays in full control
    this.setupAngularRouterBridge(mainEl);

    // 6. Scroll to hash section if URL has a hash (e.g. /#services, /#process)
    if (window.location.hash) {
      const targetId = window.location.hash.slice(1);
      setTimeout(() => {
        const section = document.getElementById(targetId);
        section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }

  private setupAngularRouterBridge(mainEl: HTMLElement): void {
    const clickHandler = (ev: MouseEvent) => {
      if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) {
        return;
      }
      const target = ev.target as HTMLElement | null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;

      const rawHref = anchor.getAttribute('href') || '';
      if (!rawHref || rawHref.startsWith('http') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
        return;
      }

      const normalized = rawHref
        .replace(/^\.\//, '/')
        .replace(/\.html($|#|\?)/, '$1');

      const [pathPart, hashPart] = normalized.split('#');
      const targetPath = (pathPart || '/').replace(/\/+$/, '') || '/';
      const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';

      ev.preventDefault();
      ev.stopPropagation();

      if (targetPath === currentPath && hashPart) {
        history.replaceState(history.state, '', `${targetPath}#${hashPart}`);
        const section = document.getElementById(hashPart);
        section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      this.ngZone.run(() => {
        const fullUrl = hashPart ? `${targetPath}#${hashPart}` : targetPath;
        history.pushState(history.state, '', fullUrl);
        void this.router.navigateByUrl(fullUrl).then(() => {
          if (hashPart) {
            setTimeout(() => {
              const section = document.getElementById(hashPart);
              section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 180);
          } else {
            window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
          }
        });
      });
    };

    mainEl.addEventListener('click', clickHandler, true);
    this.cleanupFns.push(() => mainEl.removeEventListener('click', clickHandler, true));
  }

  destroy(): void {
    this.mountVersion++;
    for (const fn of this.cleanupFns) {
      try {
        fn();
      } catch {}
    }
    this.cleanupFns = [];
    if (this.framerModPromise) {
      void this.framerModPromise.then((m) => m.unmountFramerPage()).catch(() => {});
    }
  }
}
