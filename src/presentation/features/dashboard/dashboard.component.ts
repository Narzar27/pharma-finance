import {
  Component, ChangeDetectionStrategy, inject, signal, computed, OnInit
} from '@angular/core';
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
  template: `
    <app-top-bar title="Dashboard">
      <a routerLink="/invoices"
         style="display:inline-flex; align-items:center; gap:6px; padding:7px 14px; border-radius:8px; font-size:0.78rem; font-weight:600; text-decoration:none; letter-spacing:0.03em; background:linear-gradient(135deg,#d4a853,#b8923f); color:#08111a;">
        + New Invoice
      </a>
    </app-top-bar>

    <div style="padding:28px;" class="fade-up">
      <!-- Summary cards -->
      <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:16px; margin-bottom:32px;">

        <!-- Unpaid USD -->
        <div class="fade-up fade-up-1" style="background:#16222e; border:1px solid #243a50; border-radius:12px; padding:20px;">
          <p style="font-size:0.7rem; font-weight:500; color:#7a8f9e; letter-spacing:0.08em; text-transform:uppercase; margin:0 0 8px;">Unpaid (USD)</p>
          <p class="num" style="font-size:1.5rem; font-weight:600; color:#e74c3c; margin:0;">
            {{ unpaidUsd() | currencyFormat:'USD' }}
          </p>
          <p style="font-size:0.72rem; color:#4a6070; margin:4px 0 0;">{{ unpaidInvoices().length }} invoices</p>
        </div>

        <!-- Unpaid LBP -->
        <div class="fade-up fade-up-2" style="background:#16222e; border:1px solid #243a50; border-radius:12px; padding:20px;">
          <p style="font-size:0.7rem; font-weight:500; color:#7a8f9e; letter-spacing:0.08em; text-transform:uppercase; margin:0 0 8px;">Unpaid (LBP)</p>
          <p class="num" style="font-size:1.5rem; font-weight:600; color:#e74c3c; margin:0;">
            {{ unpaidLbp() | currencyFormat:'LBP' }}
          </p>
        </div>

        <!-- Income this month USD -->
        <div class="fade-up fade-up-3" style="background:#16222e; border:1px solid #243a50; border-radius:12px; padding:20px;">
          <p style="font-size:0.7rem; font-weight:500; color:#7a8f9e; letter-spacing:0.08em; text-transform:uppercase; margin:0 0 8px;">Income This Month (USD)</p>
          <p class="num" style="font-size:1.5rem; font-weight:600; color:#27ae60; margin:0;">
            {{ incomeUsd() | currencyFormat:'USD' }}
          </p>
        </div>

        <!-- Income this month LBP -->
        <div class="fade-up fade-up-4" style="background:#16222e; border:1px solid #243a50; border-radius:12px; padding:20px;">
          <p style="font-size:0.7rem; font-weight:500; color:#7a8f9e; letter-spacing:0.08em; text-transform:uppercase; margin:0 0 8px;">Income This Month (LBP)</p>
          <p class="num" style="font-size:1.5rem; font-weight:600; color:#27ae60; margin:0;">
            {{ incomeLbp() | currencyFormat:'LBP' }}
          </p>
        </div>

        <!-- Overdue -->
        <div class="fade-up fade-up-5" style="background:#16222e; border:1px solid rgba(231,76,60,0.3); border-radius:12px; padding:20px;">
          <p style="font-size:0.7rem; font-weight:500; color:#7a8f9e; letter-spacing:0.08em; text-transform:uppercase; margin:0 0 8px;">Overdue</p>
          <p class="num" style="font-size:1.5rem; font-weight:600; color:#e74c3c; margin:0;">{{ overdueInvoices().length }}</p>
          <p style="font-size:0.72rem; color:#4a6070; margin:4px 0 0;">invoices past due</p>
        </div>

        <!-- Due soon -->
        <div class="fade-up fade-up-5" style="background:#16222e; border:1px solid rgba(243,156,18,0.3); border-radius:12px; padding:20px;">
          <p style="font-size:0.7rem; font-weight:500; color:#7a8f9e; letter-spacing:0.08em; text-transform:uppercase; margin:0 0 8px;">Due in 7 Days</p>
          <p class="num" style="font-size:1.5rem; font-weight:600; color:#f39c12; margin:0;">{{ dueSoonInvoices().length }}</p>
          <p style="font-size:0.72rem; color:#4a6070; margin:4px 0 0;">upcoming payments</p>
        </div>

      </div>

      <!-- Upcoming payments table -->
      @if (upcomingAndOverdue().length > 0) {
        <div style="background:#16222e; border:1px solid #243a50; border-radius:12px; overflow:hidden;">
          <div style="padding:18px 20px 14px; border-bottom:1px solid #1c2f40; display:flex; align-items:center; justify-content:space-between;">
            <h2 style="font-family:'DM Serif Display',serif; font-size:1rem; color:#e8edf2; margin:0; font-weight:400;">
              Upcoming & Overdue
            </h2>
            <a routerLink="/invoices" style="font-size:0.75rem; color:#d4a853; text-decoration:none;">View all →</a>
          </div>
          <table style="width:100%; border-collapse:collapse;">
            <thead>
              <tr style="border-bottom:1px solid #1c2f40;">
                <th style="padding:10px 20px; text-align:left; font-size:0.68rem; font-weight:500; color:#4a6070; letter-spacing:0.08em; text-transform:uppercase;">Supplier</th>
                <th style="padding:10px 12px; text-align:right; font-size:0.68rem; font-weight:500; color:#4a6070; letter-spacing:0.08em; text-transform:uppercase;">Amount</th>
                <th style="padding:10px 12px; text-align:center; font-size:0.68rem; font-weight:500; color:#4a6070; letter-spacing:0.08em; text-transform:uppercase;">Due</th>
                <th style="padding:10px 20px 10px 12px; text-align:center; font-size:0.68rem; font-weight:500; color:#4a6070; letter-spacing:0.08em; text-transform:uppercase;">Status</th>
              </tr>
            </thead>
            <tbody>
              @for (inv of upcomingAndOverdue(); track inv.id) {
                <tr [style.background]="isOverdue(inv.dueDate) ? 'rgba(231,76,60,0.03)' : 'transparent'"
                    style="border-bottom:1px solid #1c2f40; cursor:pointer; transition:background 0.15s;"
                    (mouseenter)="$any($event.target).closest('tr').style.background = isOverdue(inv.dueDate) ? 'rgba(231,76,60,0.07)' : '#1c2f40'"
                    (mouseleave)="$any($event.target).closest('tr').style.background = isOverdue(inv.dueDate) ? 'rgba(231,76,60,0.03)' : 'transparent'"
                    [routerLink]="['/invoices', inv.id]">
                  <td style="padding:12px 20px; font-size:0.82rem; color:#e8edf2;">{{ inv.supplierName }}</td>
                  <td style="padding:12px; text-align:right;">
                    <span class="num" style="font-size:0.82rem; color:#e8edf2;">
                      {{ inv.amount | currencyFormat:inv.currency }}
                    </span>
                  </td>
                  <td style="padding:12px; text-align:center;">
                    <span class="num" style="font-size:0.78rem;"
                          [style.color]="isOverdue(inv.dueDate) ? '#e74c3c' : '#f39c12'">
                      {{ inv.dueDate }}
                    </span>
                  </td>
                  <td style="padding:12px 20px 12px 12px; text-align:center;">
                    <app-status-badge [status]="inv.status" />
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else if (!loading()) {
        <div style="text-align:center; padding:48px; color:#4a6070;">
          <p style="font-size:0.875rem;">No upcoming or overdue invoices. All clear!</p>
        </div>
      }
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private listInvoices = inject(ListInvoicesUseCase);
  private listIncome = inject(ListIncomeRecordsUseCase);

  loading = signal(true);
  allInvoices = signal<Invoice[]>([]);
  incomeUsd = signal(0);
  incomeLbp = signal(0);

  unpaidInvoices = computed(() =>
    this.allInvoices().filter(i => i.status === 'unpaid' || i.status === 'partial')
  );
  unpaidUsd = computed(() =>
    this.unpaidInvoices().filter(i => i.currency === 'USD').reduce((s, i) => s + i.amount, 0)
  );
  unpaidLbp = computed(() =>
    this.unpaidInvoices().filter(i => i.currency === 'LBP').reduce((s, i) => s + i.amount, 0)
  );
  overdueInvoices = computed(() =>
    this.unpaidInvoices().filter(i => isOverdue(i.dueDate))
  );
  dueSoonInvoices = computed(() =>
    this.unpaidInvoices().filter(i => isDueSoon(i.dueDate, 7))
  );
  upcomingAndOverdue = computed(() => [
    ...this.overdueInvoices(),
    ...this.dueSoonInvoices(),
  ].slice(0, 10));

  isOverdue = isOverdue;

  async ngOnInit() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const [invoices, income] = await Promise.all([
      this.listInvoices.execute(),
      this.listIncome.execute(monthStart, monthEnd),
    ]);

    this.allInvoices.set(invoices);
    this.incomeUsd.set(income.filter(i => i.currency === 'USD').reduce((s, i) => s + i.amount, 0));
    this.incomeLbp.set(income.filter(i => i.currency === 'LBP').reduce((s, i) => s + i.amount, 0));
    this.loading.set(false);
  }
}
