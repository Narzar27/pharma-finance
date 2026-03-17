import {
  Component, ChangeDetectionStrategy, inject, signal, OnInit
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TopBarComponent } from '../../core/layout/top-bar/top-bar.component';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { CurrencyBadgeComponent } from '../../shared/components/currency-badge/currency-badge.component';
import { ListInvoicesUseCase } from '../../../application/use-cases/invoices/list-invoices.use-case';
import { CreateInvoiceUseCase } from '../../../application/use-cases/invoices/create-invoice.use-case';
import { DeleteInvoiceUseCase } from '../../../application/use-cases/invoices/delete-invoice.use-case';
import { ListSuppliersUseCase } from '../../../application/use-cases/suppliers/list-suppliers.use-case';
import { Invoice, Currency } from '../../../domain/models/invoice.model';
import { Supplier } from '../../../domain/models/supplier.model';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { isOverdue } from '../../../domain/services/invoice-status.service';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [FormsModule, RouterLink, TopBarComponent, CurrencyFormatPipe, StatusBadgeComponent, CurrencyBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-top-bar title="Invoices">
      <button class="btn-primary" (click)="showForm.set(true)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        New Invoice
      </button>
    </app-top-bar>

    <div style="padding:28px;">

      <!-- Filters -->
      <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;">
        <select class="input" style="width:auto;" [(ngModel)]="filterStatus" (ngModelChange)="applyFilter()">
          <option value="">All Statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
        </select>
        <select class="input" style="width:auto;" [(ngModel)]="filterCurrency" (ngModelChange)="applyFilter()">
          <option value="">All Currencies</option>
          <option value="USD">USD</option>
          <option value="LBP">LBP</option>
        </select>
        <select class="input" style="width:auto;min-width:160px;" [(ngModel)]="filterSupplier" (ngModelChange)="applyFilter()">
          <option value="">All Suppliers</option>
          @for (s of suppliers(); track s.id) {
            <option [value]="s.id">{{ s.name }}</option>
          }
        </select>
      </div>

      <!-- New Invoice modal -->
      @if (showForm()) {
        <div class="modal-overlay" (click)="closeIfBackdrop($event)">
          <div class="modal fade-up" (click)="$event.stopPropagation()">
            <h3 style="font-family:'DM Serif Display',serif;font-size:1.15rem;color:var(--text-primary);margin:0 0 20px;font-weight:400;">New Invoice</h3>
            <form (ngSubmit)="onSubmit()">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
                <div style="grid-column:1/-1;">
                  <label class="label">Supplier *</label>
                  <select class="input" [(ngModel)]="form.supplierId" name="supplierId" required>
                    <option value="">Select supplier...</option>
                    @for (s of suppliers(); track s.id) {
                      <option [value]="s.id">{{ s.name }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label class="label">Amount *</label>
                  <input class="input font-mono" type="number" [(ngModel)]="form.amount" name="amount" required min="0" step="0.01" />
                </div>
                <div>
                  <label class="label">Currency *</label>
                  <select class="input" [(ngModel)]="form.currency" name="currency">
                    <option value="USD">USD</option>
                    <option value="LBP">LBP</option>
                  </select>
                </div>
                <div>
                  <label class="label">Issue Date *</label>
                  <input class="input font-mono" type="date" [(ngModel)]="form.issueDate" name="issueDate" required />
                </div>
                <div>
                  <label class="label">Due Date *</label>
                  <input class="input font-mono" type="date" [(ngModel)]="form.dueDate" name="dueDate" required />
                </div>
                <div style="grid-column:1/-1;">
                  <label class="label">Notes</label>
                  <input class="input" type="text" [(ngModel)]="form.notes" name="notes" placeholder="Optional" />
                </div>
              </div>
              <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button type="button" class="btn-ghost" (click)="showForm.set(false)">Cancel</button>
                <button type="submit" class="btn-primary" [disabled]="saving()">
                  {{ saving() ? 'Saving...' : 'Save Invoice' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Invoice table -->
      @if (loading()) {
        <div style="padding:56px;text-align:center;color:var(--text-dim);font-size:.875rem;">Loading invoices...</div>
      } @else if (filtered().length === 0) {
        <div style="text-align:center;padding:72px;color:var(--text-dim);">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 14px;display:block;opacity:.35;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <p style="font-size:.875rem;margin:0 0 16px;">No invoices found</p>
          <button class="btn-primary" (click)="showForm.set(true)">Add your first invoice</button>
        </div>
      } @else {
        <div class="table-wrap fade-up">
          <table>
            <thead>
              <tr>
                <th>Supplier</th>
                <th style="text-align:right;">Amount</th>
                <th style="text-align:right;">Remaining</th>
                <th style="text-align:center;">Cur.</th>
                <th style="text-align:center;">Issue</th>
                <th style="text-align:center;">Due</th>
                <th style="text-align:center;">Status</th>
                <th style="width:48px;"></th>
              </tr>
            </thead>
            <tbody>
              @for (inv of filtered(); track inv.id) {
                <tr [class]="isOverdue(inv.dueDate) && inv.status !== 'paid' ? 'row-danger' : ''"
                    style="cursor:pointer;" [routerLink]="['/invoices', inv.id]">
                  <td style="font-weight:500;">{{ inv.supplierName }}</td>
                  <td style="text-align:right;">
                    <span class="font-mono" style="font-size:.82rem;">{{ inv.amount | currencyFormat:inv.currency }}</span>
                  </td>
                  <td style="text-align:right;">
                    @if (inv.status === 'partial') {
                      <span class="font-mono" style="font-size:.82rem;color:var(--amber);">
                        {{ remaining(inv) | currencyFormat:inv.currency }}
                      </span>
                    } @else if (inv.status === 'paid') {
                      <span style="font-size:.78rem;color:var(--green);">Paid</span>
                    } @else {
                      <span class="font-mono" style="font-size:.82rem;color:var(--text-dim);">{{ inv.amount | currencyFormat:inv.currency }}</span>
                    }
                  </td>
                  <td style="text-align:center;">
                    <app-currency-badge [currency]="inv.currency" />
                  </td>
                  <td style="text-align:center;">
                    <span class="font-mono" style="font-size:.78rem;color:var(--text-secondary);">{{ inv.issueDate }}</span>
                  </td>
                  <td style="text-align:center;">
                    <span class="font-mono" style="font-size:.78rem;"
                          [style.color]="isOverdue(inv.dueDate) && inv.status !== 'paid' ? 'var(--red)' : 'var(--text-secondary)'">
                      {{ inv.dueDate }}
                    </span>
                  </td>
                  <td style="text-align:center;">
                    <app-status-badge [status]="inv.status" />
                  </td>
                  <td (click)="$event.stopPropagation(); $event.preventDefault()" style="text-align:center;width:48px;">
                    @if (deletingId() === inv.id) {
                      <div style="display:flex;gap:4px;justify-content:center;align-items:center;">
                        <button (click)="confirmDelete(inv.id)"
                                style="padding:3px 8px;border-radius:4px;border:none;background:var(--red);color:#fff;font-size:.7rem;font-weight:600;cursor:pointer;">Yes</button>
                        <button (click)="deletingId.set(null)"
                                style="padding:3px 8px;border-radius:4px;border:1px solid var(--border);background:none;color:var(--text-secondary);font-size:.7rem;cursor:pointer;">No</button>
                      </div>
                    } @else {
                      <button (click)="deletingId.set(inv.id)"
                              style="width:28px;height:28px;border-radius:4px;border:none;background:none;cursor:pointer;color:var(--text-dim);display:inline-flex;align-items:center;justify-content:center;transition:color .15s,background .15s;"
                              onmouseenter="this.style.color='var(--red)';this.style.background='var(--red-bg)'"
                              onmouseleave="this.style.color='var(--text-dim)';this.style.background='none'">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class InvoicesComponent implements OnInit {
  private listInvoices = inject(ListInvoicesUseCase);
  private createInvoice = inject(CreateInvoiceUseCase);
  private deleteInvoice = inject(DeleteInvoiceUseCase);
  private listSuppliers = inject(ListSuppliersUseCase);
  private paymentRepo = inject(PaymentRepository);

  loading = signal(true);
  saving = signal(false);
  showForm = signal(false);
  deletingId = signal<string | null>(null);
  invoices = signal<Invoice[]>([]);
  filtered = signal<Invoice[]>([]);
  suppliers = signal<Supplier[]>([]);
  private paymentTotals = new Map<string, { usd: number; lbp: number }>();

  filterStatus = '';
  filterCurrency = '';
  filterSupplier = '';

  isOverdue = isOverdue;

  form = {
    supplierId: '',
    amount: 0,
    currency: 'USD' as Currency,
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    notes: '',
  };

  async ngOnInit() {
    const [invoices, suppliers, totals] = await Promise.all([
      this.listInvoices.execute(),
      this.listSuppliers.execute(),
      this.paymentRepo.getAllTotals(),
    ]);
    this.paymentTotals = totals;
    this.invoices.set(invoices);
    this.filtered.set(invoices);
    this.suppliers.set(suppliers);
    this.loading.set(false);
  }

  remaining(inv: Invoice): number {
    const paid = this.paymentTotals.get(inv.id);
    if (!paid) return inv.amount;
    const paidInCurrency = inv.currency === 'USD' ? paid.usd : paid.lbp;
    return Math.max(0, inv.amount - paidInCurrency);
  }

  applyFilter() {
    this.filtered.set(
      this.invoices().filter(inv => {
        if (this.filterStatus && inv.status !== this.filterStatus) return false;
        if (this.filterCurrency && inv.currency !== this.filterCurrency) return false;
        if (this.filterSupplier && inv.supplierId !== this.filterSupplier) return false;
        return true;
      })
    );
  }

  async onSubmit() {
    if (!this.form.supplierId || !this.form.amount || !this.form.dueDate) return;
    this.saving.set(true);
    await this.createInvoice.execute({
      supplierId: this.form.supplierId,
      amount: this.form.amount,
      currency: this.form.currency,
      issueDate: this.form.issueDate,
      dueDate: this.form.dueDate,
      notes: this.form.notes || undefined,
    });
    this.saving.set(false);
    this.showForm.set(false);
    const [invoices, totals] = await Promise.all([
      this.listInvoices.execute(),
      this.paymentRepo.getAllTotals(),
    ]);
    this.paymentTotals = totals;
    this.invoices.set(invoices);
    this.applyFilter();
  }

  async confirmDelete(id: string) {
    await this.deleteInvoice.execute(id);
    this.deletingId.set(null);
    const [invoices, totals] = await Promise.all([
      this.listInvoices.execute(),
      this.paymentRepo.getAllTotals(),
    ]);
    this.paymentTotals = totals;
    this.invoices.set(invoices);
    this.applyFilter();
  }

  closeIfBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) this.showForm.set(false);
  }
}
