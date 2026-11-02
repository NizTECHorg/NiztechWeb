import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewEncapsulation,
  inject,
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { FramerAnimatorService } from '../../core/services/framer-animator.service';

@Component({
  selector: 'app-not-found',
  standalone: true,
  template: '<div id="main"></div>',
  encapsulation: ViewEncapsulation.None,
})
export class NotFoundComponent implements AfterViewInit, OnDestroy {
  private readonly el = inject(ElementRef);
  private readonly animator = inject(FramerAnimatorService);
  private readonly title = inject(Title);

  constructor() {
    this.title.setTitle('NIZ TECH | Erro');
  }

  ngAfterViewInit(): void {
    this.animator.initPageInteractions(this.el.nativeElement as HTMLElement, 'not-found');
  }

  ngOnDestroy(): void {
    this.animator.destroy();
  }
}
