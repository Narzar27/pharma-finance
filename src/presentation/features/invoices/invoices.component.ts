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
import { ListSuppliersUseCase } from '../../../application/use-cases/suppliers/list-suppliers.use-case';
import { Invoice, Currency } from '../../../domain/models/invoice.model';
import { Supplier } from '../../../domain/models/supplier.model';
import { isOverdue } from '../../../domain/services/invoice-status.service';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [FormsModule, RouterLink, TopBarComponent, CurrencyFormatPipe, StatusBadgeComponent, CurrencyBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-top-bar title="Invoices">
      <button (click)="showForm.set(true)"
              style="padding:7px 14px;border-radius:8px;font-size:0.78rem;font-weight:600;border:none;cursor:pointer;background:linear-gradient(135deg,#d4a853,#b8923f);color:#08111a;">
        + New Invoice
      </button>
    </app-top-bar>

    <div style="padding:28px;" class="fade-up">

      <!-- Filters -->
      <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;">
        <select [(ngModel)]="filterStatus" (ngModelChange)="applyFilter()"
                style="background:#16222e;border:1px solid #243a50;border-radius:8px;padding:7px 12px;font-size:0.8rem;color:#e8edf2;outline:none;cursor:pointer;">
          <option value="">All Statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
        </select>
        <select [(ngModel)]="filterCurrency" (ngModelChange)="applyFilter()"
                style="background:#16222e;border:1px solid #243a50;border-radius:8px;padding:7px 12px;font-size:0.8rem;color:#e8edf2;outline:none;cursor:pointer;">
          <option value="">All Currencies</option>
          <option value="USD">USD</option>
          <option value="LBP">LBP</option>
        </select>
        <select [(ngModel)]="filterSupplier" (ngModelChange)="applyFilter()"
                style="background:#16222e;border:1px solid #243a50;border-radius:8px;padding:7px 12px;font-size:0.8rem;color:#e8edf2;outline:none;cursor:pointer;min-width:160px;">
          <option value="">All Suppliers</option>
          @for (s of suppliers(); track s.id) {
            <option [value]="s.id">{{ s.name }}</option>
          }
        </select>
      </div>

      <!-- New Invoice modal -->
      @if (showForm()) {
        <div style="position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:rgba(8,17,26,0.8);">
          <div style="background:#16222e;border:1px solid #243a50;border-radius:12px;padding:28px;width:100%;max-width:460px;" class="fade-up">
            <h3 style="font-family:'DM Serif Display',serif;font-size:1.1rem;color:#e8edf2;margin:0 0 20px;font-weight:400;">New Invoice</h3>
            <form (ngSubmit)="onSubmit()">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
                <div style="grid-column:1/-1;">
                  <label style="display:block;font-size:0.72rem;font-weight:500;color:#7a8f9e;letter-spacing:0.07em;text-transform:uppercase;margin-bottom:6px;">Supplier *</label>
                  <select [(ngModel)]="form.supplierId" name="supplierId" required
                          style="width:100%;background:#1c2f40;border:1px solid #243a50;border-radius:8px;padding:9px 12px;font-size:0.875rem;color:#e8edf2;outline:none;">
                    <option value="">Select supplier...</option>
                    @for (s of suppliers(); track s.id) {
                      <option [value]="s.id">{{ s.name }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label style="display:block;font-size:0.72rem;font-weight:500;color:#7a8f9e;letter-spacing:0.07em;text-transform:uppercase;margin-bottom:6px;">Amount *</label>
                  <input type="number" [(ngModel)]="form.amount" name="amount" required min="0" step="0.01"
                         style="width:100%;background:#1c2f40;border:1px solid #243a50;border-radius:8px;padding:9px 12px;font-size:0.875rem;color:#e8edf2;outline:none;font-family:'JetBrains Mono',monospace;" />
                </div>
                <div>
                  <label style="display:block;font-size:0.72rem;font-weight:500;color:#7a8f9e;letter-spacing:0.07em;text-transform:uppercase;margin-bottom:6px;">Currency *</label>
                  <select [(ngModel)]="form.currency" name="currency"
                          style="width:100%;background:#1c2f40;border:1px solid #243a50;border-radius:8px;padding:9px 12px;font-size:0.875rem;color:#e8edf2;outline:none;">
                    <option value="USD">USD</option>
                    <option value="LBP">LBP</option>
                  </select>
                </div>
                <div>
                  <label style="display:block;font-size:0.72rem;font-weight:500;color:#7a8f9e;letter-spacing:0.07em;text-transform:uppercase;margin-bottom:6px;">Issue Date *</label>
                  <input type="date" [(ngModel)]="form.issueDate" name="issueDate" required
                         style="width:100%;background:#1c2f40;border:1px solid #243a50;border-radius:8px;padding:9px 12px;font-size:0.875rem;color:#e8edf2;outline:none;font-family:'JetBrains Mono',monospace;" />
                </div>
                <div>
                  <label style="display:block;font-size:0.72rem;font-weight:500;color:#7a8f9e;letter-spacing:0.07em;text-transform:uppercase;margin-bottom:6px;">Due Date *</label>
                  <input type="date" [(ngModel)]="form.dueDate" name="dueDate" required
                         style="width:100%;background:#1c2f40;border:1px solid #243a50;border-radius:8px;padding:9px 12px;font-size:0.875rem;color:#e8edf2;outline:none;font-family:'JetBrains Mono',monospace;" />
                </div>
                <div style="grid-column:1/-1;">
                  <label style="display:block;font-size:0.72rem;font-weight:500;color:#7a8f9e;letter-spacing:0.07em;text-transform:uppercase;margin-bottom:6px;">Notes</label>
                  <input type="text" [(ngModel)]="form.notes" name="notes"
                         style="width:100%;background:#1c2f40;border:1px solid #243a50;border-radius:8px;padding:9px 12px;font-size:0.875rem;color:#e8edf2;outline:none;" />
                </div>
              </div>
              <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button type="button" (click)="showForm.set(false)"
                        style="padding:8px 16px;border-radius:8px;font-size:0.8rem;font-weight:500;border:1px solid #243a50;background:none;color:#7a8f9e;cursor:pointer;">
                  Cancel
                </button>
                <button type="submit" [disabled]="saving()"
                        style="padding:8px 16px;border-radius:8px;font-size:0.8rem;font-weight:600;border:none;cursor:pointer;background:linear-gradient(135deg,#d4a853,#b8923f);color:#08111a;">
                  {{ saving() ? 'Saving...' : 'Save Invoice' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Invoice table -->
      <div style="background:#16222e;border:1px solid #243a50;border-radius:12px;overflow:hidden;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid #1c2f40;">
              <th style="padding:10px 20px;text-align:left;font-size:0.68rem;font-weight:500;color:#4a6070;letter-spacing:0.08em;text-transform:uppercase;">Supplier</th>
              <th style="padding:10px 12px;text-align:right;font-size:0.68rem;font-weight:500;color:#4a6070;letter-spacing:0.08em;text-transform:uppercase;">Amount</th>
              <th style="padding:10px 12px;text-align:center;font-size:0.68rem;font-weight:500;color:#4a6070;letter-spacing:0.08em;text-transform:uppercase;">Cur.</th>
              <th style="padding:10px 12px;text-align:center;font-size:0.68rem;font-weight:500;color:#4a6070;letter-spacing:0.08em;text-transform:uppercase;">Issue</th>
              <th style="padding:10px 12px;text-align:center;font-size:0.68rem;font-weight:500;color:#4a6070;letter-spacing:0.08em;text-transform:uppercase;">Due</th>
              <th style="padding:10px 20px 10px 12px;text-align:center;font-size:0.68rem;font-weight:500;color:#4a6070;letter-spacing:0.08em;text-transform:uppercase;">Status</th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr><td colspan="6" style="padding:32px;text-align:center;color:#4a6070;font-size:0.875rem;">Loading...</td></tr>
            } @else if (filtered().length === 0) {
              <tr><td colspan="6" style="padding:32px;text-align:center;color:#4a6070;font-size:0.875rem;">No invoices found.</td></tr>
            } @else {
              @for (inv of filtered(); track inv.id) {
                <tr [style.background]="isOverdue(inv.dueDate) && inv.status !== 'paid' ? 'rgba(231,76,60,0.03)' : 'transparent'"
                    style="border-bottom:1px solid #1c2f40;cursor:pointer;transition:background 0.15s;"
                    [routerLink]="['/invoices', inv.id]">
                  <td style="padding:12px 20px;font-size:0.82rem;color:#e8edf2;">{{ inv.supplierName }}</td>
                  <td style="padding:12px;text-align:right;">
                    <span class="num" style="font-size:0.82rem;color:#e8edf2;">{{ inv.amount | currencyFormat:inv.currency }}</span>
                  </td>
                  <td style="padding:12px;text-align:center;">
                    <app-currency-badge [currency]="inv.currency" />
                  </td>
                  <td style="padding:12px;text-align:center;">
                    <span class="num" style="font-size:0.78rem;color:#7a8f9e;">{{ inv.issueDate }}</span>
                  </td>
                  <td style="padding:12px;text-align:center;">
                    <span class="num" style="font-size:0.78rem;"
                          [style.color]="isOverdue(inv.dueDate) && inv.status !== 'paid' ? '#e74c3c' : '#7a8f9e'">
                      {{ inv.dueDate }}
                    </span>
                  </td>
                  <td style="padding:12px 20px 12px 12px;text-align:center;">
                    <app-status-badge [status]="inv.status" />
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class InvoicesComponent implements OnInit {
  private listInvoices = inject(ListInvoicesUseCase);
  private createInvoice = inject(CreateInvoiceUseCase);
  private listSuppliers = inject(ListSuppliersUseCase);

  loading = signal(true);
  saving = signal(false);
  showForm = signal(false);
  invoices = signal<Invoice[]>([]);
  filtered = signal<Invoice[]>([]);
  suppliers = signal<Supplier[]>([]);

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
    const [invoices, suppliers] = await Promise.all([
      this.listInvoices.execute(),
      this.listSuppliers.execute(),
    ]);
    this.invoices.set(invoices);
    this.filtered.set(invoices);
    this.suppliers.set(suppliers);
    this.loading.set(false);
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
    const invoices = await this.listInvoices.execute();
    this.invoices.set(invoices);
    this.applyFilter();
  }
}
