import { Injectable, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LoaderSession, PageLoaderService } from './page-loader.service';

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

/** Framer page chunks (lazy-imported by script_main on hydrate) — warmed while the loader is up. */
const PAGE_CHUNKS: Record<FramerPageKey, string> = {
  home: '/assets/animate/W8J_EbCVf1Hs7Knuw21lhxZ1zuFnJ1OLVRAoCrlnNC4.C9-cOVbG.mjs',
  sobre: '/assets/animate/oJRcVeiGwMxDxQmYTzUrEmMnMiG6oD4MdthAnHA9MxM.BPiHxZXC.mjs',
  projects: '/assets/animate/NRVyBFn2thYt7wChe03Tski5JPw9j0NHpKqJsDkNV3k.vQFGTKoW.mjs',
  fluxo: '/assets/animate/N0ycXPFvwpLxsgnsPo8Bi6jfot5Ya0tq4WdnHlJ1VoU.End6lFRX.mjs',
  nokta: '/assets/animate/N0ycXPFvwpLxsgnsPo8Bi6jfot5Ya0tq4WdnHlJ1VoU.End6lFRX.mjs',
  contact: '/assets/animate/XOVRzqjCBFmmUsBwcvSFbPCX-QnJkLav2w2R40qyeXY.Kj5gOXFG.mjs',
  'not-found': '/assets/animate/8vnYPyqsZ_VbNJYRkf94b-ZLlTVsUfObNbFdKCvebZ8.CVZffaRo.mjs',
};

/** Safety net: never keep the loader up longer than this, even if an asset hangs. */
const LOADER_MAX_WAIT_MS = 12000;

const dynamicImport = new Function('u', 'return import(u)') as <T = unknown>(
  url: string
) => Promise<T>;

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
  private readonly loader = inject(PageLoaderService);
  private loaderSession: LoaderSession | null = null;
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
      this.framerModPromise = dynamicImport<FramerMainModule>(
        '/assets/animate/script_main.CkCRKjyS.mjs'
      );
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
    // 0. Full-screen NIZ TECH loader: everything below is tracked by its progress bar.
    const session = this.loader.begin();
    this.loaderSession = session;

    const modPromise = session.track(this.loadFramerMainModule());
    const chunkPromise = session.track(
      dynamicImport(PAGE_CHUNKS[pageKey]).catch(() => undefined)
    );
    const payload = await session.track(this.loadPayload(pageKey));
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

    // 2b. Wait for every asset of the page (eager images, fonts, Framer runtime + page chunk)
    //     while the loader covers the screen. Appear animations only start afterwards.
    const assets: Promise<unknown>[] = [modPromise, chunkPromise];
    mainEl.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
      if (img.loading === 'lazy') return;
      assets.push(session.track(this.waitForImage(img)));
    });
    if (document.fonts?.ready) {
      assets.push(session.track(document.fonts.ready.catch(() => undefined)));
    }
    await Promise.race([
      Promise.allSettled(assets),
      new Promise((r) => setTimeout(r, LOADER_MAX_WAIT_MS)),
    ]);
    if (version !== this.mountVersion) return;
    await session.finish();
    if (version !== this.mountVersion) return;

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
    const mod = await modPromise;
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

  private waitForImage(img: HTMLImageElement): Promise<void> {
    if (img.complete) return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => {
        img.removeEventListener('load', done);
        img.removeEventListener('error', done);
        resolve();
      };
      img.addEventListener('load', done);
      img.addEventListener('error', done);
    });
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
    this.loaderSession?.cancel();
    this.loaderSession = null;
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
