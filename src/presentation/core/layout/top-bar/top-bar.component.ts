import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-top-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header style="
      height: 56px;
      background: #0f1923;
      border-bottom: 1px solid #1c2f40;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 28px;
      position: sticky; top: 0; z-index: 40;
    ">
      <h1 style="
        font-family: 'DM Serif Display', serif;
        font-size: 1.15rem;
        color: #e8edf2;
        margin: 0;
        font-weight: 400;
      ">{{ title() }}</h1>

      <div style="display:flex; align-items:center; gap:12px;">
        <ng-content />
      </div>
    </header>
  `,
})
export class TopBarComponent {
  title = input('');
}
