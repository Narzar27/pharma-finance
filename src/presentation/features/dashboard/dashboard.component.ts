import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TopBarComponent } from '../../core/layout/top-bar/top-bar.component';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { ListInvoicesUseCase } from '../../../application/use-cases/invoices/list-invoices.use-case';
import { GenerateReportUseCase, ReportResult } from '../../../application/use-cases/reports/generate-report.use-case';
import { Invoice } from '../../../domain/models/invoice.model';
import { isOverdue, isDueSoon } from '../../../domain/services/invoice-status.service';

type Preset = 'this-month' | 'last-month' | 'this-week' | 'custom';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, RouterLink, TopBarComponent, CurrencyFormatPipe, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private listInvoices = inject(ListInvoicesUseCase);
  private generateReport = inject(GenerateReportUseCase);

  loading = signal(true);
  allInvoices = signal<Invoice[]>([]);
  report = signal<ReportResult | null>(null);
  preset = signal<Preset>('this-month');
  customFrom = '';
  customTo = '';
  isOverdue = isOverdue;

  presets: { value: Preset; label: string }[] = [
    { value: 'this-month', label: 'This Month' },
    { value: 'last-month', label: 'Last Month' },
    { value: 'this-week', label: 'This Week' },
    { value: 'custom', label: 'Custom' },
  ];

  netUsd = computed(() => this.report()?.netBalance.usd ?? 0);
  netLbp = computed(() => this.report()?.netBalance.lbp ?? 0);

  // Real-time snapshots — unaffected by the selected date range.
  unpaidInvoices = computed(() => this.allInvoices().filter(i => i.status !== 'paid'));
  unpaidUsd = computed(() => this.unpaidInvoices().filter(i => i.currency === 'USD').reduce((s, i) => s + i.amount, 0));
  unpaidLbp = computed(() => this.unpaidInvoices().filter(i => i.currency === 'LBP').reduce((s, i) => s + i.amount, 0));
  unpaidUsdCount = computed(() => this.unpaidInvoices().filter(i => i.currency === 'USD').length);
  unpaidLbpCount = computed(() => this.unpaidInvoices().filter(i => i.currency === 'LBP').length);
  overdueInvoices = computed(() => this.unpaidInvoices().filter(i => isOverdue(i.dueDate)));
  dueSoonInvoices = computed(() => this.unpaidInvoices().filter(i => isDueSoon(i.dueDate, 7)));
  upcomingAndOverdue = computed(() => {
    const overdue = this.overdueInvoices();
    const rest = this.unpaidInvoices().filter(i => !isOverdue(i.dueDate));
    return [...overdue, ...rest].slice(0, 15);
  });

  async ngOnInit() {
    this.allInvoices.set(await this.listInvoices.execute());
    await this.loadReport();
    this.loading.set(false);
  }

  selectPreset(p: Preset) {
    this.preset.set(p);
    if (p !== 'custom') this.loadReport();
  }

  onCustomChange() {
    if (this.customFrom && this.customTo) this.loadReport();
  }

  async loadReport() {
    const range = this.getRange();
    if (!range) return;
    this.report.set(await this.generateReport.execute(range));
  }

  private getRange(): { from: string; to: string } | null {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    switch (this.preset()) {
      case 'this-month':
        return {
          from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)),
          to: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
        };
      case 'last-month':
        return {
          from: fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
          to: fmt(new Date(now.getFullYear(), now.getMonth(), 0)),
        };
      case 'this-week': {
        const day = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - ((day + 6) % 7));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return { from: fmt(monday), to: fmt(sunday) };
      }
      case 'custom':
        return this.customFrom && this.customTo
          ? { from: this.customFrom, to: this.customTo }
          : null;
    }
  }
}
