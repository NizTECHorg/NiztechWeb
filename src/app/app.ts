import { Component, ViewEncapsulation } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SvgDefsComponent } from './shared/svg-defs/svg-defs.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SvgDefsComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  encapsulation: ViewEncapsulation.None,
})
export class App {}
