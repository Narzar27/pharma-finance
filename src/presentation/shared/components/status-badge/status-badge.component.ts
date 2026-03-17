import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { InvoiceStatus } from '../../../../domain/models/invoice.model';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span [class]="badgeClass()">{{ label() }}</span>
  `,
})
export class StatusBadgeComponent {
  status = input.required<InvoiceStatus>();

  label() {
    const labels: Record<InvoiceStatus, string> = {
      unpaid: 'Unpaid',
      partial: 'Partial',
      paid: 'Paid',
    };
    return labels[this.status()];
  }

  badgeClass() {
    const base = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium';
    const colors: Record<InvoiceStatus, string> = {
      unpaid: 'bg-red-100 text-red-700',
      partial: 'bg-amber-100 text-amber-700',
      paid: 'bg-green-100 text-green-700',
    };
    return `${base} ${colors[this.status()]}`;
  }
}
