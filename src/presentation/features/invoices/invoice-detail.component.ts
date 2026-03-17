import {
  Component, ChangeDetectionStrategy, inject, signal, computed, OnInit
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TopBarComponent } from '../../core/layout/top-bar/top-bar.component';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { CurrencyBadgeComponent } from '../../shared/components/currency-badge/currency-badge.component';
import { GetInvoiceDetailUseCase, InvoiceDetail } from '../../../application/use-cases/invoices/get-invoice-detail.use-case';
import { AddPaymentUseCase } from '../../../application/use-cases/invoices/add-payment.use-case';
import { DeleteInvoiceUseCase } from '../../../application/use-cases/invoices/delete-invoice.use-case';
import { DeletePaymentUseCase } from '../../../application/use-cases/invoices/delete-payment.use-case';
import { Currency } from '../../../domain/models/invoice.model';

@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [FormsModule, RouterLink, TopBarComponent, CurrencyFormatPipe, StatusBadgeComponent, CurrencyBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-top-bar [title]="detail()?.invoice?.supplierName ?? 'Invoice Detail'">
      <div style="display:flex;gap:8px;align-items:center;">
        @if (confirmDeleteInvoice()) {
          <span style="font-size:.75rem;color:var(--text-secondary);">Delete this invoice?</span>
          <button (click)="doDeleteInvoice()" style="padding:6px 12px;border-radius:var(--radius-sm);border:none;background:var(--red);color:#fff;font-size:.78rem;font-weight:600;cursor:pointer;">Delete</button>
          <button (click)="confirmDeleteInvoice.set(false)" class="btn-ghost" style="font-size:.78rem;">Cancel</button>
        } @else {
          <button (click)="confirmDeleteInvoice.set(true)"
                  style="padding:6px 12px;border-radius:var(--radius-sm);border:1px solid var(--border);background:none;color:var(--text-dim);font-size:.78rem;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:color .15s,border-color .15s;"
                  onmouseenter="this.style.color='var(--red)';this.style.borderColor='var(--red)'"
                  onmouseleave="this.style.color='var(--text-dim)';this.style.borderColor='var(--border)'">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            Delete Invoice
          </button>
          <a routerLink="/invoices" class="btn-ghost" style="font-size:.78rem;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </a>
        }
      </div>
    </app-top-bar>

    <div style="padding:28px;max-width:740px;">

      @if (loading()) {
        <div style="padding:56px;text-align:center;color:var(--text-dim);font-size:.875rem;">Loading...</div>
      } @else if (detail()) {

        <!-- Invoice summary card -->
        <div class="card fade-up fade-up-1" style="padding:24px;margin-bottom:16px;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;">
            <div>
              <h2 style="font-family:'DM Serif Display',serif;font-size:1.3rem;color:var(--text-primary);margin:0 0 10px;font-weight:400;">
                {{ detail()!.invoice.supplierName }}
              </h2>
              <div style="display:flex;gap:8px;align-items:center;">
                <app-status-badge [status]="detail()!.invoice.status" />
                <app-currency-badge [currency]="detail()!.invoice.currency" />
              </div>
            </div>
            <p class="font-mono" style="font-size:1.75rem;font-weight:600;color:var(--text-primary);margin:0;">
              {{ detail()!.invoice.amount | currencyFormat:detail()!.invoice.currency }}
            </p>
          </div>
          <hr class="divider" style="margin-bottom:18px;" />
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">
            <div>
              <p style="font-size:.65rem;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em;margin:0 0 4px;">Issue Date</p>
              <p class="font-mono" style="font-size:.82rem;color:var(--text-secondary);margin:0;">{{ detail()!.invoice.issueDate }}</p>
            </div>
            <div>
              <p style="font-size:.65rem;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em;margin:0 0 4px;">Due Date</p>
              <p class="font-mono" style="font-size:.82rem;margin:0;"
                 [style.color]="detail()!.invoice.status === 'paid' ? 'var(--text-secondary)' : 'var(--red)'">
                {{ detail()!.invoice.dueDate }}
              </p>
            </div>
            <div>
              <p style="font-size:.65rem;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em;margin:0 0 4px;">Total Paid</p>
              @if (detail()!.totalPaid.usd > 0) {
                <p class="font-mono" style="font-size:.82rem;color:var(--green);margin:0;">{{ detail()!.totalPaid.usd | currencyFormat:'USD' }}</p>
              }
              @if (detail()!.totalPaid.lbp > 0) {
                <p class="font-mono" style="font-size:.82rem;color:var(--green);margin:0;">{{ detail()!.totalPaid.lbp | currencyFormat:'LBP' }}</p>
              }
              @if (detail()!.totalPaid.usd === 0 && detail()!.totalPaid.lbp === 0) {
                <p style="font-size:.82rem;color:var(--text-dim);margin:0;">None</p>
              }
            </div>
            @if (detail()!.invoice.status === 'partial') {
              <div>
                <p style="font-size:.65rem;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em;margin:0 0 4px;">Remaining</p>
                <p class="font-mono" style="font-size:.82rem;font-weight:600;color:var(--amber);margin:0;">
                  {{ remaining() | currencyFormat:detail()!.invoice.currency }}
                </p>
              </div>
            }
          </div>
          @if (detail()!.invoice.notes) {
            <p style="font-size:.8rem;color:var(--text-secondary);margin:16px 0 0;border-top:1px solid var(--border);padding-top:14px;">
              {{ detail()!.invoice.notes }}
            </p>
          }
        </div>

        <!-- Add payment -->
        @if (detail()!.invoice.status !== 'paid') {
          <div class="card fade-up fade-up-2" style="padding:22px;margin-bottom:16px;">
            <h3 style="font-family:'DM Serif Display',serif;font-size:1rem;color:var(--text-primary);margin:0 0 16px;font-weight:400;">Add Payment</h3>
            <form (ngSubmit)="onAddPayment()">
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;">
                <div>
                  <label class="label">Amount *</label>
                  <input class="input font-mono" type="number" [(ngModel)]="payForm.amount" name="payAmount" required min="0" step="0.01" />
                </div>
                <div>
                  <label class="label">Currency</label>
                  <select class="input" [(ngModel)]="payForm.currency" name="payCurrency">
                    <option value="USD">USD</option>
                    <option value="LBP">LBP</option>
                  </select>
                </div>
                <div>
                  <label class="label">Date *</label>
                  <input class="input font-mono" type="date" [(ngModel)]="payForm.paymentDate" name="payDate" required />
                </div>
              </div>
              <div style="display:flex;gap:10px;align-items:center;">
                <input class="input" style="flex:1;" type="text" [(ngModel)]="payForm.notes" name="payNotes" placeholder="Notes (optional)" />
                <button type="submit" class="btn-primary" [disabled]="addingPayment()" style="white-space:nowrap;">
                  {{ addingPayment() ? 'Adding...' : 'Add Payment' }}
                </button>
              </div>
            </form>
          </div>
        }

        <!-- Payment history -->
        @if (detail()!.payments.length > 0) {
          <div class="table-wrap fade-up fade-up-3">
            <div style="padding:16px 20px;border-bottom:1px solid var(--border);background:var(--bg-elevated);">
              <h3 class="section-title">Payment History</h3>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th style="text-align:right;">Amount</th>
                  <th>Notes</th>
                  <th style="width:48px;"></th>
                </tr>
              </thead>
              <tbody>
                @for (p of detail()!.payments; track p.id) {
                  <tr>
                    <td><span class="font-mono" style="font-size:.8rem;color:var(--text-secondary);">{{ p.paymentDate }}</span></td>
                    <td style="text-align:right;"><span class="font-mono" style="font-size:.82rem;color:var(--green);">{{ p.amountPaid | currencyFormat:p.currency }}</span></td>
                    <td style="font-size:.8rem;color:var(--text-dim);">{{ p.notes ?? '—' }}</td>
                    <td style="text-align:center;width:48px;">
                      @if (deletingPaymentId() === p.id) {
                        <div style="display:flex;gap:4px;justify-content:center;align-items:center;">
                          <button (click)="confirmDeletePayment(p.id)"
                                  style="padding:3px 8px;border-radius:4px;border:none;background:var(--red);color:#fff;font-size:.7rem;font-weight:600;cursor:pointer;">Yes</button>
                          <button (click)="deletingPaymentId.set(null)"
                                  style="padding:3px 8px;border-radius:4px;border:1px solid var(--border);background:none;color:var(--text-secondary);font-size:.7rem;cursor:pointer;">No</button>
                        </div>
                      } @else {
                        <button (click)="deletingPaymentId.set(p.id)"
                                style="width:28px;height:28px;border-radius:4px;border:none;background:none;cursor:pointer;color:var(--text-dim);display:inline-flex;align-items:center;justify-content:center;"
                                onmouseenter="this.style.color='var(--red)';this.style.background='var(--red-bg)'"
                                onmouseleave="this.style.color='var(--text-dim)';this.style.background='none'">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else if (detail()!.invoice.status !== 'paid') {
          <div class="card fade-up fade-up-3" style="padding:20px;text-align:center;color:var(--text-dim);font-size:.8rem;">
            No payments recorded yet
          </div>
        }
      }
    </div>
  `,
})
export class InvoiceDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private getDetail = inject(GetInvoiceDetailUseCase);
  private addPayment = inject(AddPaymentUseCase);
  private deleteInvoice = inject(DeleteInvoiceUseCase);
  private deletePayment = inject(DeletePaymentUseCase);

  loading = signal(true);
  addingPayment = signal(false);
  confirmDeleteInvoice = signal(false);
  deletingPaymentId = signal<string | null>(null);
  detail = signal<InvoiceDetail | null>(null);

  remaining = computed(() => {
    const d = this.detail();
    if (!d) return 0;
    const paid = d.invoice.currency === 'USD' ? d.totalPaid.usd : d.totalPaid.lbp;
    return Math.max(0, d.invoice.amount - paid);
  });

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

  async doDeleteInvoice() {
    const d = this.detail();
    if (!d) return;
    await this.deleteInvoice.execute(d.invoice.id);
    this.router.navigate(['/invoices']);
  }

  async confirmDeletePayment(paymentId: string) {
    const d = this.detail();
    if (!d) return;
    await this.deletePayment.execute(paymentId);
    this.deletingPaymentId.set(null);
    const updated = await this.getDetail.execute(d.invoice.id);
    this.detail.set(updated);
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
    const updated = await this.getDetail.execute(d.invoice.id);
    this.detail.set(updated);
    this.payForm.amount = 0;
    this.payForm.notes = '';
    this.addingPayment.set(false);
  }
}
