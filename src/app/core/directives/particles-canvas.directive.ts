import {
  Directive,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  targetAlpha: number;
  alphaSpeed: number;
}

@Directive({
  selector: 'canvas[appParticlesCanvas]',
  standalone: true,
})
export class ParticlesCanvasDirective implements OnInit, OnDestroy {
  @Input() particleCount = 75;
  @Input() particleColor = '255, 255, 255';
  @Input() maxRadius = 1.6;
  @Input() speed = 0.25;

  private readonly el = inject(ElementRef<HTMLCanvasElement>);
  private readonly ngZone = inject(NgZone);
  private animationFrameId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private particles: Particle[] = [];

  ngOnInit(): void {
    this.ngZone.runOutsideAngular(() => {
      const canvas = this.el.nativeElement;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const updateSize = () => {
        const rect = canvas.parentElement?.getBoundingClientRect() || canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, rect.width * dpr);
        canvas.height = Math.max(1, rect.height * dpr);
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.initParticles(rect.width, rect.height);
      };

      updateSize();

      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => updateSize());
        if (canvas.parentElement) {
          this.resizeObserver.observe(canvas.parentElement);
        }
      }

      const render = () => {
        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);
        ctx.clearRect(0, 0, width, height);

        for (const p of this.particles) {
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;

          if (Math.abs(p.alpha - p.targetAlpha) < 0.02) {
            p.targetAlpha = 0.1 + Math.random() * 0.85;
          }
          p.alpha += (p.targetAlpha - p.alpha) * p.alphaSpeed;

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${this.particleColor}, ${p.alpha.toFixed(3)})`;
          ctx.fill();
        }

        this.animationFrameId = requestAnimationFrame(render);
      };

      this.animationFrameId = requestAnimationFrame(render);
    });
  }

  private initParticles(width: number, height: number): void {
    const w = Math.max(width, 300);
    const h = Math.max(height, 200);
    this.particles = Array.from({ length: this.particleCount }, () => {
      const angle = Math.random() * Math.PI * 2;
      const spd = (0.1 + Math.random() * 0.9) * this.speed;
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 0.05,
        radius: 0.4 + Math.random() * this.maxRadius,
        alpha: 0.1 + Math.random() * 0.8,
        targetAlpha: 0.1 + Math.random() * 0.9,
        alphaSpeed: 0.01 + Math.random() * 0.03,
      };
    });
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.resizeObserver?.disconnect();
  }
}
