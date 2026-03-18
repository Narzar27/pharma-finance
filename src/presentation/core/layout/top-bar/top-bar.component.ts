import { Component, ChangeDetectionStrategy, inject, input } from '@angular/core';
import { MenuService } from '../menu/menu.service';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './top-bar.component.html',
  styleUrl: './top-bar.component.scss',
})
export class TopBarComponent {
  title = input('');
  menu = inject(MenuService);
}
