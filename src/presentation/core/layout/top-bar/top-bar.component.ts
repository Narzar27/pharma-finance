import { Component, ChangeDetectionStrategy, inject, input } from '@angular/core';
import { MenuService } from '../menu/menu.service';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header style="
      height:58px;
      background:var(--bg-surface);
      border-bottom:1px solid var(--border);
      display:flex;align-items:center;justify-content:space-between;
      padding:0 28px;
      position:sticky;top:0;z-index:40;
      transition:background .25s,border-color .25s;
    ">
      <div style="display:flex;align-items:center;gap:12px;">
        <button class="hamburger-btn" (click)="menu.toggle()" title="Menu">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <h1 style="font-family:'DM Serif Display',serif;font-size:1.15rem;color:var(--text-primary);margin:0;font-weight:400;">
          {{ title() }}
        </h1>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <ng-content />
      </div>
    </header>
  `,
})
export class TopBarComponent {
  title = input('');
  menu = inject(MenuService);
}
