import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { Currency } from '../../../../domain/models/invoice.model';

@Component({
  selector: 'app-currency-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span [class]="badgeClass()">{{ currency() }}</span>
  `,
})
export class CurrencyBadgeComponent {
  currency = input.required<Currency>();

  badgeClass() {
    const base = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium';
    return this.currency() === 'USD'
      ? `${base} bg-green-100 text-green-700`
      : `${base} bg-amber-100 text-amber-700`;
  }
}
