import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TopBarComponent } from '../../core/layout/top-bar/top-bar.component';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { ListInvoicesUseCase } from '../../../application/use-cases/invoices/list-invoices.use-case';
import { ListIncomeRecordsUseCase } from '../../../application/use-cases/income/list-income-records.use-case';
import { Invoice } from '../../../domain/models/invoice.model';
import { isOverdue, isDueSoon } from '../../../domain/services/invoice-status.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, TopBarComponent, CurrencyFormatPipe, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private listInvoices = inject(ListInvoicesUseCase);
  private listIncome = inject(ListIncomeRecordsUseCase);

  loading = signal(true);
  allInvoices = signal<Invoice[]>([]);
  incomeUsd = signal(0);
  incomeLbp = signal(0);
  isOverdue = isOverdue;

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
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const monthStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthEndStr = `${monthEnd.getFullYear()}-${pad(monthEnd.getMonth() + 1)}-${pad(monthEnd.getDate())}`;

    const [invoices, income] = await Promise.all([
      this.listInvoices.execute(),
      this.listIncome.execute(monthStart, monthEndStr),
    ]);
    this.allInvoices.set(invoices);
    this.incomeUsd.set(income.filter(i => i.currency === 'USD').reduce((s, i) => s + i.amount, 0));
    this.incomeLbp.set(income.filter(i => i.currency === 'LBP').reduce((s, i) => s + i.amount, 0));
    this.loading.set(false);
  }
}
