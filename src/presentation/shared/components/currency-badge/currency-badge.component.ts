import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { Currency } from '../../../../domain/models/invoice.model';

@Component({
  selector: 'app-currency-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class]="currency() === 'USD' ? 'badge-usd' : 'badge-lbp'">{{ currency() }}</span>`,
})
export class CurrencyBadgeComponent {
  currency = input.required<Currency>();
}
