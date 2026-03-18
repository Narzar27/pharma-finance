import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { Currency } from '../../../../domain/models/invoice.model';

@Component({
  selector: 'app-currency-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './currency-badge.component.html',
  styleUrl: './currency-badge.component.scss',
})
export class CurrencyBadgeComponent {
  currency = input.required<Currency>();
}
