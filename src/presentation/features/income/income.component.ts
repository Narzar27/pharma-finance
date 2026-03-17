import {
  Component, ChangeDetectionStrategy, inject, signal, computed, OnInit
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopBarComponent } from '../../core/layout/top-bar/top-bar.component';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { CurrencyBadgeComponent } from '../../shared/components/currency-badge/currency-badge.component';
import { ListIncomeRecordsUseCase } from '../../../application/use-cases/income/list-income-records.use-case';
import { CreateIncomeRecordUseCase } from '../../../application/use-cases/income/create-income-record.use-case';
import { DeleteIncomeRecordUseCase } from '../../../application/use-cases/income/delete-income-record.use-case';
import { IncomeRecord } from '../../../domain/models/income-record.model';
import { Currency } from '../../../domain/models/invoice.model';

type Preset = 'today' | 'this-week' | 'this-month' | 'last-month' | 'all' | 'custom';

interface IncomeRow {
  amount: number;
  currency: Currency;
  date: string;
  source: string;
  notes: string;
}

@Component({
  selector: 'app-income',
  standalone: true,
  imports: [FormsModule, TopBarComponent, CurrencyFormatPipe, CurrencyBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-top-bar title="Income">
      <button class="btn-primary" (click)="openForm()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Income
      </button>
    </app-top-bar>

    <div style="padding:28px;">

      <!-- Filters row -->
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:20px;flex-wrap:wrap;">
        @for (p of presets; track p.value) {
          <button (click)="selectPreset(p.value)"
                  [class]="preset() === p.value ? 'btn-primary' : 'btn-ghost'"
                  style="font-size:.78rem;padding:7px 14px;">
            {{ p.label }}
          </button>
        }
        @if (preset() === 'custom') {
          <input class="input font-mono" type="date" [(ngModel)]="customFrom"
                 (ngModelChange)="onCustomChange()" style="width:auto;" />
          <span style="color:var(--text-dim);font-size:.8rem;">to</span>
          <input class="input font-mono" type="date" [(ngModel)]="customTo"
                 (ngModelChange)="onCustomChange()" style="width:auto;" />
        }
        <div style="margin-left:auto;">
          <select class="input" style="width:auto;" [(ngModel)]="filterCurrency" (ngModelChange)="onCurrencyChange()">
            <option value="">All Currencies</option>
            <option value="USD">USD only</option>
            <option value="LBP">LBP only</option>
          </select>
        </div>
      </div>

      <!-- Totals -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;margin-bottom:28px;max-width:520px;">
        @if (filterCurrency !== 'LBP') {
          <div class="stat-card fade-up fade-up-1">
            <p class="stat-label">Total — USD</p>
            <p class="stat-value" style="color:var(--green);">{{ filteredUsd() | currencyFormat:'USD' }}</p>
            <p style="font-size:.72rem;color:var(--text-dim);margin:6px 0 0;">{{ filteredUsdCount() }} records</p>
          </div>
        }
        @if (filterCurrency !== 'USD') {
          <div class="stat-card fade-up fade-up-2">
            <p class="stat-label">Total — LBP</p>
            <p class="stat-value" style="color:var(--green);">{{ filteredLbp() | currencyFormat:'LBP' }}</p>
            <p style="font-size:.72rem;color:var(--text-dim);margin:6px 0 0;">{{ filteredLbpCount() }} records</p>
          </div>
        }
      </div>

      <!-- Add modal -->
      @if (showForm()) {
        <div class="modal-overlay" (click)="closeIfBackdrop($event)">
          <div class="modal fade-up" style="max-width:680px;max-height:90vh;display:flex;flex-direction:column;" (click)="$event.stopPropagation()">

            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-shrink:0;">
              <h3 style="font-family:'DM Serif Display',serif;font-size:1.15rem;color:var(--text-primary);margin:0;font-weight:400;">Add Income Records</h3>
              <span style="font-size:.75rem;color:var(--text-dim);">{{ rows.length }} {{ rows.length === 1 ? 'record' : 'records' }}</span>
            </div>

            <!-- Column headers -->
            <div style="display:grid;grid-template-columns:120px 1fr 80px 1fr 36px;gap:8px;margin-bottom:6px;padding:0 2px;flex-shrink:0;">
              <span class="label" style="margin:0;">Date</span>
              <span class="label" style="margin:0;">Amount</span>
              <span class="label" style="margin:0;">Cur.</span>
              <span class="label" style="margin:0;">Source</span>
              <span></span>
            </div>

            <!-- Rows -->
            <div style="overflow-y:auto;flex:1;padding-right:2px;">
              @for (row of rows; track $index; let i = $index) {
                <div style="display:grid;grid-template-columns:120px 1fr 80px 1fr 36px;gap:8px;margin-bottom:8px;align-items:center;">
                  <input class="input font-mono" type="date"
                         [name]="'date_' + i" [(ngModel)]="row.date" style="padding:8px 10px;font-size:.8rem;" />
                  <input class="input font-mono" type="number" min="0" step="0.01" placeholder="0.00"
                         [name]="'amount_' + i" [(ngModel)]="row.amount" style="padding:8px 10px;font-size:.8rem;" />
                  <select class="input" [name]="'currency_' + i" [(ngModel)]="row.currency" style="padding:8px 10px;font-size:.8rem;">
                    <option value="USD">USD</option>
                    <option value="LBP">LBP</option>
                  </select>
                  <input class="input" type="text" placeholder="Source (optional)"
                         [name]="'source_' + i" [(ngModel)]="row.source" style="padding:8px 10px;font-size:.8rem;" />
                  <button type="button" (click)="removeRow(i)" [disabled]="rows.length === 1"
                          style="width:36px;height:36px;border-radius:var(--radius-sm);background:none;border:1px solid var(--border);cursor:pointer;color:var(--text-dim);display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s;"
                          [style.opacity]="rows.length === 1 ? '0.3' : '1'"
                          (mouseenter)="rows.length > 1 && $any($event.currentTarget).style.setProperty('color','var(--red)')"
                          (mouseleave)="$any($event.currentTarget).style.setProperty('color','var(--text-dim)')">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              }
            </div>

            <!-- Add row + actions -->
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:16px;padding-top:16px;border-top:1px solid var(--border);flex-shrink:0;">
              <button type="button" class="btn-ghost" style="font-size:.78rem;" (click)="addRow()">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Row
              </button>
              <div style="display:flex;gap:10px;">
                <button type="button" class="btn-ghost" (click)="showForm.set(false)">Cancel</button>
                <button type="button" class="btn-primary" [disabled]="saving()" (click)="onSubmit()">
                  @if (saving()) {
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin .7s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    Saving...
                  } @else {
                    Save {{ rows.length === 1 ? '1 Record' : rows.length + ' Records' }}
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Records table -->
      @if (loading()) {
        <div style="padding:56px;text-align:center;color:var(--text-dim);font-size:.875rem;">Loading records...</div>
      } @else if (filtered().length === 0) {
        <div style="text-align:center;padding:72px;color:var(--text-dim);">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 14px;display:block;opacity:.35;"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          <p style="font-size:.875rem;margin:0 0 16px;">No records for this period</p>
          <button class="btn-primary" (click)="openForm()">Add a record</button>
        </div>
      } @else {
        <div class="table-wrap fade-up">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th style="text-align:right;">Amount</th>
                <th style="text-align:center;">Cur.</th>
                <th>Source</th>
                <th>Notes</th>
                <th style="width:48px;"></th>
              </tr>
            </thead>
            <tbody>
              @for (r of filtered(); track r.id) {
                <tr>
                  <td><span class="font-mono" style="font-size:.8rem;color:var(--text-secondary);">{{ r.date }}</span></td>
                  <td style="text-align:right;"><span class="font-mono" style="font-size:.82rem;color:var(--green);">{{ r.amount | currencyFormat:r.currency }}</span></td>
                  <td style="text-align:center;"><app-currency-badge [currency]="r.currency" /></td>
                  <td style="font-size:.82rem;color:var(--text-primary);">{{ r.source ?? '—' }}</td>
                  <td style="font-size:.8rem;color:var(--text-dim);">{{ r.notes ?? '—' }}</td>
                  <td style="text-align:center;width:48px;">
                    @if (deletingId() === r.id) {
                      <div style="display:flex;gap:4px;justify-content:center;align-items:center;">
                        <button (click)="confirmDelete(r.id)"
                                style="padding:3px 8px;border-radius:4px;border:none;background:var(--red);color:#fff;font-size:.7rem;font-weight:600;cursor:pointer;">Yes</button>
                        <button (click)="deletingId.set(null)"
                                style="padding:3px 8px;border-radius:4px;border:1px solid var(--border);background:none;color:var(--text-secondary);font-size:.7rem;cursor:pointer;">No</button>
                      </div>
                    } @else {
                      <button (click)="deletingId.set(r.id)"
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
      }
    </div>
    <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
  `,
})
export class IncomeComponent implements OnInit {
  private listIncome = inject(ListIncomeRecordsUseCase);
  private createIncome = inject(CreateIncomeRecordUseCase);
  private deleteIncome = inject(DeleteIncomeRecordUseCase);

  loading = signal(true);
  saving = signal(false);
  showForm = signal(false);
  deletingId = signal<string | null>(null);
  records = signal<IncomeRecord[]>([]);
  preset = signal<Preset>('this-month');

  filterCurrency = '';
  customFrom = '';
  customTo = '';
  rows: IncomeRow[] = [];

  presets: { value: Preset; label: string }[] = [
    { value: 'today',      label: 'Today' },
    { value: 'this-week',  label: 'This Week' },
    { value: 'this-month', label: 'This Month' },
    { value: 'last-month', label: 'Last Month' },
    { value: 'all',        label: 'All Time' },
    { value: 'custom',     label: 'Custom' },
  ];

  filtered      = computed(() => {
    const cur = this.filterCurrency;
    return cur ? this.records().filter(r => r.currency === cur) : this.records();
  });
  filteredUsd      = computed(() => this.filtered().filter(r => r.currency === 'USD').reduce((s, r) => s + r.amount, 0));
  filteredLbp      = computed(() => this.filtered().filter(r => r.currency === 'LBP').reduce((s, r) => s + r.amount, 0));
  filteredUsdCount = computed(() => this.filtered().filter(r => r.currency === 'USD').length);
  filteredLbpCount = computed(() => this.filtered().filter(r => r.currency === 'LBP').length);

  async ngOnInit() { await this.load(); }

  openForm() {
    this.rows = [this.emptyRow()];
    this.showForm.set(true);
  }

  addRow() { this.rows = [...this.rows, this.emptyRow()]; }

  removeRow(i: number) { this.rows = this.rows.filter((_, idx) => idx !== i); }

  selectPreset(p: Preset) {
    this.preset.set(p);
    if (p !== 'custom') this.load();
  }

  onCustomChange() { if (this.customFrom && this.customTo) this.load(); }
  onCurrencyChange() {}

  async load() {
    const range = this.getRange();
    this.loading.set(true);
    this.records.set(await this.listIncome.execute(range?.from, range?.to));
    this.loading.set(false);
  }

  async onSubmit() {
    const valid = this.rows.filter(r => r.amount > 0 && r.date);
    if (!valid.length) return;
    this.saving.set(true);
    await Promise.all(valid.map(r => this.createIncome.execute({
      amount: r.amount,
      currency: r.currency,
      date: r.date,
      source: r.source || undefined,
      notes: r.notes || undefined,
    })));
    this.saving.set(false);
    this.showForm.set(false);
    await this.load();
  }

  async confirmDelete(id: string) {
    await this.deleteIncome.execute(id);
    this.deletingId.set(null);
    await this.load();
  }

  closeIfBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) this.showForm.set(false);
  }

  private emptyRow(): IncomeRow {
    return { amount: 0, currency: 'USD', date: new Date().toISOString().split('T')[0], source: '', notes: '' };
  }

  private getRange(): { from: string; to: string } | null {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    switch (this.preset()) {
      case 'today':      return { from: fmt(now), to: fmt(now) };
      case 'this-week': {
        const monday = new Date(now);
        monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return { from: fmt(monday), to: fmt(sunday) };
      }
      case 'this-month': return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
      case 'last-month': return { from: fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: fmt(new Date(now.getFullYear(), now.getMonth(), 0)) };
      case 'all':        return null;
      case 'custom':     return this.customFrom && this.customTo ? { from: this.customFrom, to: this.customTo } : null;
    }
  }
}
