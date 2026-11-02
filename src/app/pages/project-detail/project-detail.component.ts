import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewEncapsulation,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { FramerAnimatorService } from '../../core/services/framer-animator.service';
import { PROJECTS_DATA } from '../../core/data/site-content.data';

@Component({
  selector: 'app-fluxo-project',
  standalone: true,
  template: '<div id="main"></div>',
  encapsulation: ViewEncapsulation.None,
})
export class FluxoProjectComponent implements AfterViewInit, OnDestroy {
  private readonly el = inject(ElementRef);
  private readonly animator = inject(FramerAnimatorService);

  ngAfterViewInit(): void {
    this.animator.initPageInteractions(this.el.nativeElement as HTMLElement, 'fluxo');
  }

  ngOnDestroy(): void {
    this.animator.destroy();
  }
}

@Component({
  selector: 'app-nokta-project',
  standalone: true,
  template: '<div id="main"></div>',
  encapsulation: ViewEncapsulation.None,
})
export class NoktaProjectComponent implements AfterViewInit, OnDestroy {
  private readonly el = inject(ElementRef);
  private readonly animator = inject(FramerAnimatorService);

  ngAfterViewInit(): void {
    this.animator.initPageInteractions(this.el.nativeElement as HTMLElement, 'nokta');
  }

  ngOnDestroy(): void {
    this.animator.destroy();
  }
}

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [FluxoProjectComponent, NoktaProjectComponent],
  template: `
    @if (slug() === 'nokta') {
      <app-nokta-project />
    } @else {
      <app-fluxo-project />
    }
  `,
  encapsulation: ViewEncapsulation.None,
})
export class ProjectDetailComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly sub: Subscription;

  readonly slug = signal<'fluxo' | 'nokta'>('fluxo');

  constructor() {
    this.sub = this.route.paramMap.subscribe((params) => {
      const s = (params.get('slug') || 'fluxo').toLowerCase();
      const validSlug: 'fluxo' | 'nokta' = s === 'nokta' ? 'nokta' : 'fluxo';
      this.slug.set(validSlug);
      const info = PROJECTS_DATA[validSlug];
      this.title.setTitle(`NIZ TECH | ${info.title}`);
    });
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
