import { Component, ChangeDetectionStrategy, input } from '@angular/core';

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
      <h1 style="font-family:'DM Serif Display',serif;font-size:1.15rem;color:var(--text-primary);margin:0;font-weight:400;">
        {{ title() }}
      </h1>
      <div style="display:flex;align-items:center;gap:10px;">
        <ng-content />
      </div>
    </header>
  `,
})
export class TopBarComponent {
  title = input('');
}
