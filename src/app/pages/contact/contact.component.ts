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
  selector: 'app-contact',
  standalone: true,
  template: '<div id="main"></div>',
  encapsulation: ViewEncapsulation.None,
})
export class ContactComponent implements AfterViewInit, OnDestroy {
  private readonly el = inject(ElementRef);
  private readonly animator = inject(FramerAnimatorService);
  private readonly title = inject(Title);

  constructor() {
    this.title.setTitle('NIZ TECH | Contato');
  }

  ngAfterViewInit(): void {
    this.animator.initPageInteractions(this.el.nativeElement as HTMLElement, 'contact');
  }

  ngOnDestroy(): void {
    this.animator.destroy();
  }
}
