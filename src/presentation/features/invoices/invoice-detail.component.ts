import {
  Component, ChangeDetectionStrategy, inject, signal, OnInit
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TopBarComponent } from '../../core/layout/top-bar/top-bar.component';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { CurrencyBadgeComponent } from '../../shared/components/currency-badge/currency-badge.component';
import { GetInvoiceDetailUseCase, InvoiceDetail } from '../../../application/use-cases/invoices/get-invoice-detail.use-case';
import { AddPaymentUseCase } from '../../../application/use-cases/invoices/add-payment.use-case';
import { Currency } from '../../../domain/models/invoice.model';

@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [FormsModule, RouterLink, TopBarComponent, CurrencyFormatPipe, StatusBadgeComponent, CurrencyBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-top-bar [title]="detail()?.invoice?.supplierName ?? 'Invoice Detail'">
      <a routerLink="/invoices" style="font-size:0.78rem;color:#7a8f9e;text-decoration:none;">← Back</a>
    </app-top-bar>

    <div style="padding:28px;max-width:700px;" class="fade-up">
      @if (loading()) {
        <p style="color:#4a6070;font-size:0.875rem;">Loading...</p>
      } @else if (detail()) {
        <!-- Invoice summary card -->
        <div style="background:#16222e;border:1px solid #243a50;border-radius:12px;padding:24px;margin-bottom:20px;" class="fade-up fade-up-1">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;">
            <div>
              <h2 style="font-family:'DM Serif Display',serif;font-size:1.3rem;color:#e8edf2;margin:0 0 6px;font-weight:400;">
                {{ detail()!.invoice.supplierName }}
              </h2>
              <div style="display:flex;gap:8px;align-items:center;">
                <app-status-badge [status]="detail()!.invoice.status" />
                <app-currency-badge [currency]="detail()!.invoice.currency" />
              </div>
            </div>
            <p class="num" style="font-size:1.75rem;font-weight:600;color:#e8edf2;margin:0;">
              {{ detail()!.invoice.amount | currencyFormat:detail()!.invoice.currency }}
            </p>
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;border-top:1px solid #1c2f40;padding-top:16px;">
            <div>
              <p style="font-size:0.68rem;color:#4a6070;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 3px;">Issue Date</p>
              <p class="num" style="font-size:0.82rem;color:#7a8f9e;margin:0;">{{ detail()!.invoice.issueDate }}</p>
            </div>
            <div>
              <p style="font-size:0.68rem;color:#4a6070;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 3px;">Due Date</p>
              <p class="num" style="font-size:0.82rem;margin:0;"
                 [style.color]="detail()!.invoice.status === 'paid' ? '#7a8f9e' : '#e74c3c'">
                {{ detail()!.invoice.dueDate }}
              </p>
            </div>
            <div>
              <p style="font-size:0.68rem;color:#4a6070;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 3px;">Total Paid</p>
              <div>
                @if (detail()!.totalPaid.usd > 0) {
                  <p class="num" style="font-size:0.82rem;color:#27ae60;margin:0;">{{ detail()!.totalPaid.usd | currencyFormat:'USD' }}</p>
                }
                @if (detail()!.totalPaid.lbp > 0) {
                  <p class="num" style="font-size:0.82rem;color:#27ae60;margin:0;">{{ detail()!.totalPaid.lbp | currencyFormat:'LBP' }}</p>
                }
                @if (detail()!.totalPaid.usd === 0 && detail()!.totalPaid.lbp === 0) {
                  <p style="font-size:0.82rem;color:#4a6070;margin:0;">None</p>
                }
              </div>
            </div>
          </div>
          @if (detail()!.invoice.notes) {
            <p style="font-size:0.8rem;color:#7a8f9e;margin:14px 0 0;border-top:1px solid #1c2f40;padding-top:14px;">{{ detail()!.invoice.notes }}</p>
          }
        </div>

        <!-- Add payment -->
        @if (detail()!.invoice.status !== 'paid') {
          <div style="background:#16222e;border:1px solid #243a50;border-radius:12px;padding:24px;margin-bottom:20px;" class="fade-up fade-up-2">
            <h3 style="font-family:'DM Serif Display',serif;font-size:1rem;color:#e8edf2;margin:0 0 16px;font-weight:400;">Add Payment</h3>
            <form (ngSubmit)="onAddPayment()" style="display:grid;grid-template-columns:1fr 1fr auto;gap:12px;align-items:end;">
              <div>
                <label style="display:block;font-size:0.72rem;font-weight:500;color:#7a8f9e;letter-spacing:0.07em;text-transform:uppercase;margin-bottom:6px;">Amount *</label>
                <input type="number" [(ngModel)]="payForm.amount" name="payAmount" required min="0" step="0.01"
                       style="width:100%;background:#1c2f40;border:1px solid #243a50;border-radius:8px;padding:9px 12px;font-size:0.875rem;color:#e8edf2;outline:none;font-family:'JetBrains Mono',monospace;" />
              </div>
              <div>
                <label style="display:block;font-size:0.72rem;font-weight:500;color:#7a8f9e;letter-spacing:0.07em;text-transform:uppercase;margin-bottom:6px;">Currency</label>
                <select [(ngModel)]="payForm.currency" name="payCurrency"
                        style="width:100%;background:#1c2f40;border:1px solid #243a50;border-radius:8px;padding:9px 12px;font-size:0.875rem;color:#e8edf2;outline:none;">
                  <option value="USD">USD</option>
                  <option value="LBP">LBP</option>
                </select>
              </div>
              <div>
                <label style="display:block;font-size:0.72rem;font-weight:500;color:#7a8f9e;letter-spacing:0.07em;text-transform:uppercase;margin-bottom:6px;">Date</label>
                <input type="date" [(ngModel)]="payForm.paymentDate" name="payDate" required
                       style="width:100%;background:#1c2f40;border:1px solid #243a50;border-radius:8px;padding:9px 12px;font-size:0.875rem;color:#e8edf2;outline:none;font-family:'JetBrains Mono',monospace;" />
              </div>
              <div style="grid-column:1/-1;display:flex;gap:10px;align-items:center;">
                <input type="text" [(ngModel)]="payForm.notes" name="payNotes" placeholder="Notes (optional)"
                       style="flex:1;background:#1c2f40;border:1px solid #243a50;border-radius:8px;padding:9px 12px;font-size:0.875rem;color:#e8edf2;outline:none;" />
                <button type="submit" [disabled]="addingPayment()"
                        style="padding:9px 20px;border-radius:8px;font-size:0.8rem;font-weight:600;border:none;cursor:pointer;background:linear-gradient(135deg,#d4a853,#b8923f);color:#08111a;white-space:nowrap;">
                  {{ addingPayment() ? 'Adding...' : 'Add Payment' }}
                </button>
              </div>
            </form>
          </div>
        }

        <!-- Payment history -->
        @if (detail()!.payments.length > 0) {
          <div style="background:#16222e;border:1px solid #243a50;border-radius:12px;overflow:hidden;" class="fade-up fade-up-3">
            <div style="padding:16px 20px;border-bottom:1px solid #1c2f40;">
              <h3 style="font-family:'DM Serif Display',serif;font-size:1rem;color:#e8edf2;margin:0;font-weight:400;">Payment History</h3>
            </div>
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="border-bottom:1px solid #1c2f40;">
                  <th style="padding:9px 20px;text-align:left;font-size:0.68rem;font-weight:500;color:#4a6070;letter-spacing:0.08em;text-transform:uppercase;">Date</th>
                  <th style="padding:9px 12px;text-align:right;font-size:0.68rem;font-weight:500;color:#4a6070;letter-spacing:0.08em;text-transform:uppercase;">Amount</th>
                  <th style="padding:9px 20px 9px 12px;text-align:left;font-size:0.68rem;font-weight:500;color:#4a6070;letter-spacing:0.08em;text-transform:uppercase;">Notes</th>
                </tr>
              </thead>
              <tbody>
                @for (p of detail()!.payments; track p.id) {
                  <tr style="border-bottom:1px solid #1c2f40;">
                    <td style="padding:11px 20px;"><span class="num" style="font-size:0.8rem;color:#7a8f9e;">{{ p.paymentDate }}</span></td>
                    <td style="padding:11px 12px;text-align:right;"><span class="num" style="font-size:0.82rem;color:#27ae60;">{{ p.amountPaid | currencyFormat:p.currency }}</span></td>
                    <td style="padding:11px 20px 11px 12px;font-size:0.8rem;color:#4a6070;">{{ p.notes ?? '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    </div>
  `,
})
export class InvoiceDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private getDetail = inject(GetInvoiceDetailUseCase);
  private addPayment = inject(AddPaymentUseCase);

  loading = signal(true);
  addingPayment = signal(false);
  detail = signal<InvoiceDetail | null>(null);

  payForm = {
    amount: 0,
    currency: 'USD' as Currency,
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
  };

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    const result = await this.getDetail.execute(id);
    this.detail.set(result);
    if (result) this.payForm.currency = result.invoice.currency;
    this.loading.set(false);
  }

  async onAddPayment() {
    const d = this.detail();
    if (!d || !this.payForm.amount) return;
    this.addingPayment.set(true);
    await this.addPayment.execute({
      invoiceId: d.invoice.id,
      amountPaid: this.payForm.amount,
      currency: this.payForm.currency,
      paymentDate: this.payForm.paymentDate,
      notes: this.payForm.notes || undefined,
    });
    // Reload
    const updated = await this.getDetail.execute(d.invoice.id);
    this.detail.set(updated);
    this.payForm.amount = 0;
    this.payForm.notes = '';
    this.addingPayment.set(false);
  }
}
