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
import { IncomeRecord, RecordType } from '../../../domain/models/income-record.model';
import { Currency } from '../../../domain/models/invoice.model';

type Preset = 'today' | 'this-week' | 'this-month' | 'last-month' | 'all' | 'custom';

interface CashRow {
  type: RecordType;
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
  templateUrl: './income.component.html',
  styleUrl: './income.component.scss',
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
  filterType = '';
  customFrom = '';
  customTo = '';
  rows: CashRow[] = [];

  presets: { value: Preset; label: string }[] = [
    { value: 'today',      label: 'Today' },
    { value: 'this-week',  label: 'This Week' },
    { value: 'this-month', label: 'This Month' },
    { value: 'last-month', label: 'Last Month' },
    { value: 'all',        label: 'All Time' },
    { value: 'custom',     label: 'Custom' },
  ];

  filtered = computed(() => {
    let list = this.records();
    if (this.filterCurrency) list = list.filter(r => r.currency === this.filterCurrency);
    if (this.filterType) list = list.filter(r => r.type === this.filterType);
    return list;
  });

  incomeUsd      = computed(() => this.filtered().filter(r => r.type === 'income' && r.currency === 'USD').reduce((s, r) => s + r.amount, 0));
  incomeLbp      = computed(() => this.filtered().filter(r => r.type === 'income' && r.currency === 'LBP').reduce((s, r) => s + r.amount, 0));
  incomeUsdCount = computed(() => this.filtered().filter(r => r.type === 'income' && r.currency === 'USD').length);
  incomeLbpCount = computed(() => this.filtered().filter(r => r.type === 'income' && r.currency === 'LBP').length);
  expenseUsd      = computed(() => this.filtered().filter(r => r.type === 'expense' && r.currency === 'USD').reduce((s, r) => s + r.amount, 0));
  expenseLbp      = computed(() => this.filtered().filter(r => r.type === 'expense' && r.currency === 'LBP').reduce((s, r) => s + r.amount, 0));
  expenseUsdCount = computed(() => this.filtered().filter(r => r.type === 'expense' && r.currency === 'USD').length);
  expenseLbpCount = computed(() => this.filtered().filter(r => r.type === 'expense' && r.currency === 'LBP').length);
  netUsd = computed(() => this.incomeUsd() - this.expenseUsd());
  netLbp = computed(() => this.incomeLbp() - this.expenseLbp());

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
  onFilterChange() {}

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
      type: r.type,
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

  private emptyRow(): CashRow {
    return { type: 'income', amount: 0, currency: 'USD', date: new Date().toISOString().split('T')[0], source: '', notes: '' };
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
