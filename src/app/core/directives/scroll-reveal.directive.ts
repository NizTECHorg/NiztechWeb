import {
  Directive,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';

@Directive({
  selector: '[appScrollReveal]',
  standalone: true,
})
export class ScrollRevealDirective implements OnInit, OnDestroy {
  @Input() revealDelay = 0;
  @Input() revealY = 24;

  private readonly el = inject(ElementRef<HTMLElement>);
  private observer: IntersectionObserver | null = null;

  ngOnInit(): void {
    const nativeEl = this.el.nativeElement;
    nativeEl.style.opacity = '0';
    nativeEl.style.transform = `translate3d(0, ${this.revealY}px, 0)`;
    nativeEl.style.transition = `opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${this.revealDelay}ms, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${this.revealDelay}ms`;
    nativeEl.style.willChange = 'opacity, transform';

    if (typeof IntersectionObserver === 'undefined') {
      nativeEl.style.opacity = '1';
      nativeEl.style.transform = 'translate3d(0, 0, 0)';
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            nativeEl.style.opacity = '1';
            nativeEl.style.transform = 'translate3d(0, 0, 0)';
            this.observer?.unobserve(nativeEl);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    this.observer.observe(nativeEl);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
