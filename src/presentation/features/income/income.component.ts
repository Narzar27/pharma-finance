import {
  Component, ChangeDetectionStrategy, inject, signal, OnInit
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopBarComponent } from '../../core/layout/top-bar/top-bar.component';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { CurrencyBadgeComponent } from '../../shared/components/currency-badge/currency-badge.component';
import { ListIncomeRecordsUseCase } from '../../../application/use-cases/income/list-income-records.use-case';
import { CreateIncomeRecordUseCase } from '../../../application/use-cases/income/create-income-record.use-case';
import { IncomeRecord } from '../../../domain/models/income-record.model';
import { Currency } from '../../../domain/models/invoice.model';

@Component({
  selector: 'app-income',
  standalone: true,
  imports: [FormsModule, TopBarComponent, CurrencyFormatPipe, CurrencyBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-top-bar title="Income">
      <button (click)="showForm.set(true)"
              style="padding:7px 14px;border-radius:8px;font-size:0.78rem;font-weight:600;border:none;cursor:pointer;background:linear-gradient(135deg,#d4a853,#b8923f);color:#08111a;">
        + Add Income
      </button>
    </app-top-bar>

    <div style="padding:28px;" class="fade-up">

      <!-- Totals -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;max-width:500px;">
        <div style="background:#16222e;border:1px solid #243a50;border-radius:12px;padding:18px;" class="fade-up fade-up-1">
          <p style="font-size:0.68rem;font-weight:500;color:#7a8f9e;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px;">Total (USD)</p>
          <p class="num" style="font-size:1.3rem;font-weight:600;color:#27ae60;margin:0;">{{ totalUsd() | currencyFormat:'USD' }}</p>
        </div>
        <div style="background:#16222e;border:1px solid #243a50;border-radius:12px;padding:18px;" class="fade-up fade-up-2">
          <p style="font-size:0.68rem;font-weight:500;color:#7a8f9e;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px;">Total (LBP)</p>
          <p class="num" style="font-size:1.3rem;font-weight:600;color:#27ae60;margin:0;">{{ totalLbp() | currencyFormat:'LBP' }}</p>
        </div>
      </div>

      <!-- Add modal -->
      @if (showForm()) {
        <div style="position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:rgba(8,17,26,0.8);">
          <div style="background:#16222e;border:1px solid #243a50;border-radius:12px;padding:28px;width:100%;max-width:400px;" class="fade-up">
            <h3 style="font-family:'DM Serif Display',serif;font-size:1.1rem;color:#e8edf2;margin:0 0 20px;font-weight:400;">New Income Record</h3>
            <form (ngSubmit)="onSubmit()">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
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
                  <label style="display:block;font-size:0.72rem;font-weight:500;color:#7a8f9e;letter-spacing:0.07em;text-transform:uppercase;margin-bottom:6px;">Date *</label>
                  <input type="date" [(ngModel)]="form.date" name="date" required
                         style="width:100%;background:#1c2f40;border:1px solid #243a50;border-radius:8px;padding:9px 12px;font-size:0.875rem;color:#e8edf2;outline:none;font-family:'JetBrains Mono',monospace;" />
                </div>
                <div>
                  <label style="display:block;font-size:0.72rem;font-weight:500;color:#7a8f9e;letter-spacing:0.07em;text-transform:uppercase;margin-bottom:6px;">Source</label>
                  <input type="text" [(ngModel)]="form.source" name="source" placeholder="e.g. Daily sales"
                         style="width:100%;background:#1c2f40;border:1px solid #243a50;border-radius:8px;padding:9px 12px;font-size:0.875rem;color:#e8edf2;outline:none;" />
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
                  {{ saving() ? 'Saving...' : 'Save' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Records table -->
      <div style="background:#16222e;border:1px solid #243a50;border-radius:12px;overflow:hidden;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:1px solid #1c2f40;">
              <th style="padding:10px 20px;text-align:left;font-size:0.68rem;font-weight:500;color:#4a6070;letter-spacing:0.08em;text-transform:uppercase;">Date</th>
              <th style="padding:10px 12px;text-align:right;font-size:0.68rem;font-weight:500;color:#4a6070;letter-spacing:0.08em;text-transform:uppercase;">Amount</th>
              <th style="padding:10px 12px;text-align:center;font-size:0.68rem;font-weight:500;color:#4a6070;letter-spacing:0.08em;text-transform:uppercase;">Cur.</th>
              <th style="padding:10px 12px;text-align:left;font-size:0.68rem;font-weight:500;color:#4a6070;letter-spacing:0.08em;text-transform:uppercase;">Source</th>
              <th style="padding:10px 20px 10px 12px;text-align:left;font-size:0.68rem;font-weight:500;color:#4a6070;letter-spacing:0.08em;text-transform:uppercase;">Notes</th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr><td colspan="5" style="padding:32px;text-align:center;color:#4a6070;font-size:0.875rem;">Loading...</td></tr>
            } @else if (records().length === 0) {
              <tr><td colspan="5" style="padding:32px;text-align:center;color:#4a6070;font-size:0.875rem;">No income records yet.</td></tr>
            } @else {
              @for (r of records(); track r.id) {
                <tr style="border-bottom:1px solid #1c2f40;">
                  <td style="padding:11px 20px;"><span class="num" style="font-size:0.8rem;color:#7a8f9e;">{{ r.date }}</span></td>
                  <td style="padding:11px 12px;text-align:right;"><span class="num" style="font-size:0.82rem;color:#27ae60;">{{ r.amount | currencyFormat:r.currency }}</span></td>
                  <td style="padding:11px 12px;text-align:center;"><app-currency-badge [currency]="r.currency" /></td>
                  <td style="padding:11px 12px;font-size:0.8rem;color:#e8edf2;">{{ r.source ?? '—' }}</td>
                  <td style="padding:11px 20px 11px 12px;font-size:0.8rem;color:#4a6070;">{{ r.notes ?? '—' }}</td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class IncomeComponent implements OnInit {
  private listIncome = inject(ListIncomeRecordsUseCase);
  private createIncome = inject(CreateIncomeRecordUseCase);

  loading = signal(true);
  saving = signal(false);
  showForm = signal(false);
  records = signal<IncomeRecord[]>([]);

  totalUsd = signal(0);
  totalLbp = signal(0);

  form = {
    amount: 0,
    currency: 'USD' as Currency,
    date: new Date().toISOString().split('T')[0],
    source: '',
    notes: '',
  };

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.loading.set(true);
    const records = await this.listIncome.execute();
    this.records.set(records);
    this.totalUsd.set(records.filter(r => r.currency === 'USD').reduce((s, r) => s + r.amount, 0));
    this.totalLbp.set(records.filter(r => r.currency === 'LBP').reduce((s, r) => s + r.amount, 0));
    this.loading.set(false);
  }

  async onSubmit() {
    if (!this.form.amount || !this.form.date) return;
    this.saving.set(true);
    await this.createIncome.execute({
      amount: this.form.amount,
      currency: this.form.currency,
      date: this.form.date,
      source: this.form.source || undefined,
      notes: this.form.notes || undefined,
    });
    this.form = { amount: 0, currency: 'USD', date: new Date().toISOString().split('T')[0], source: '', notes: '' };
    this.saving.set(false);
    this.showForm.set(false);
    await this.load();
  }
}
