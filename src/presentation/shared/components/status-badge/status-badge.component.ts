import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { InvoiceStatus } from '../../../../domain/models/invoice.model';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class]="'badge-' + status()">{{ labels[status()] }}</span>`,
})
export class StatusBadgeComponent {
  status = input.required<InvoiceStatus>();
  labels: Record<InvoiceStatus, string> = { unpaid: 'Unpaid', partial: 'Partial', paid: 'Paid' };
}
