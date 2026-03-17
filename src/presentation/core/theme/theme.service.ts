import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(
    (localStorage.getItem('theme') as Theme) ?? 'dark'
  );

  constructor() {
    effect(() => {
      const t = this.theme();
      document.documentElement.classList.toggle('light', t === 'light');
      localStorage.setItem('theme', t);
    });
  }

  toggle() {
    this.theme.set(this.theme() === 'dark' ? 'light' : 'dark');
  }
}
