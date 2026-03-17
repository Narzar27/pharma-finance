import {
  Component, ChangeDetectionStrategy, inject, signal, computed, OnInit
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopBarComponent } from '../../core/layout/top-bar/top-bar.component';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { GenerateReportUseCase, ReportResult } from '../../../application/use-cases/reports/generate-report.use-case';

type Preset = 'this-month' | 'last-month' | 'this-week' | 'custom';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [FormsModule, TopBarComponent, CurrencyFormatPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-top-bar title="Reports" />

    <div style="padding:28px;">

      <!-- Date range controls -->
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:28px;flex-wrap:wrap;">
        @for (p of presets; track p.value) {
          <button (click)="selectPreset(p.value)"
                  [class]="preset() === p.value ? 'btn-primary' : 'btn-ghost'"
                  style="font-size:.78rem;padding:7px 14px;">
            {{ p.label }}
          </button>
        }
        @if (preset() === 'custom') {
          <input class="input font-mono" type="date" [(ngModel)]="customFrom" (ngModelChange)="loadReport()" style="width:auto;" />
          <span style="color:var(--text-dim);font-size:.8rem;">to</span>
          <input class="input font-mono" type="date" [(ngModel)]="customTo" (ngModelChange)="loadReport()" style="width:auto;" />
        }
      </div>

      @if (loading()) {
        <div style="padding:56px;text-align:center;color:var(--text-dim);font-size:.875rem;">Generating report...</div>
      } @else if (report()) {

        <!-- Income vs Expenses cards -->
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px;margin-bottom:28px;">
          <div class="stat-card fade-up fade-up-1">
            <p class="stat-label">Income — USD</p>
            <p class="stat-value" style="color:var(--green);">{{ report()!.totalIncome.usd | currencyFormat:'USD' }}</p>
          </div>
          <div class="stat-card fade-up fade-up-1">
            <p class="stat-label">Income — LBP</p>
            <p class="stat-value" style="color:var(--green);">{{ report()!.totalIncome.lbp | currencyFormat:'LBP' }}</p>
          </div>
          <div class="stat-card fade-up fade-up-2">
            <p class="stat-label">Expenses — USD</p>
            <p class="stat-value" style="color:var(--red);">{{ report()!.totalExpenses.usd | currencyFormat:'USD' }}</p>
          </div>
          <div class="stat-card fade-up fade-up-2">
            <p class="stat-label">Expenses — LBP</p>
            <p class="stat-value" style="color:var(--red);">{{ report()!.totalExpenses.lbp | currencyFormat:'LBP' }}</p>
          </div>
          <div class="stat-card fade-up fade-up-3">
            <p class="stat-label">Net — USD</p>
            <p class="stat-value" [style.color]="report()!.netBalance.usd >= 0 ? 'var(--green)' : 'var(--red)'">
              {{ report()!.netBalance.usd | currencyFormat:'USD' }}
            </p>
          </div>
          <div class="stat-card fade-up fade-up-3">
            <p class="stat-label">Net — LBP</p>
            <p class="stat-value" [style.color]="report()!.netBalance.lbp >= 0 ? 'var(--green)' : 'var(--red)'">
              {{ report()!.netBalance.lbp | currencyFormat:'LBP' }}
            </p>
          </div>
        </div>

        <!-- Exchange rate converter -->
        <div class="card fade-up fade-up-4" style="padding:20px;margin-bottom:24px;">
          <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:.8rem;color:var(--text-secondary);white-space:nowrap;">Optional exchange rate:</span>
              <span style="font-size:.8rem;color:var(--text-dim);">1 USD =</span>
              <input class="input font-mono" type="number" [(ngModel)]="exchangeRate" (ngModelChange)="onRateChange()"
                     min="0" step="1000" placeholder="e.g. 89500" style="width:130px;" />
              <span style="font-size:.8rem;color:var(--text-dim);">LL</span>
            </div>
            @if (combinedUsdNet() !== null) {
              <div style="margin-left:auto;text-align:right;">
                <p style="font-size:.65rem;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em;margin:0 0 4px;">Combined Net (USD equiv.)</p>
                <p class="font-mono" style="font-size:1.1rem;font-weight:600;margin:0;"
                   [style.color]="combinedUsdNet()! >= 0 ? 'var(--green)' : 'var(--red)'">
                  {{ combinedUsdNet()! | currencyFormat:'USD' }}
                </p>
              </div>
            }
          </div>
        </div>

        <!-- Per-supplier balances -->
        @if (report()!.supplierBalances.length > 0) {
          <div class="table-wrap fade-up fade-up-5">
            <div style="padding:16px 20px;border-bottom:1px solid var(--border);background:var(--bg-elevated);">
              <h2 class="section-title">Outstanding Balances by Supplier</h2>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th style="text-align:right;">Owed (USD)</th>
                  <th style="text-align:right;">Owed (LBP)</th>
                </tr>
              </thead>
              <tbody>
                @for (sb of report()!.supplierBalances; track sb.supplier.id) {
                  <tr>
                    <td style="font-weight:500;">{{ sb.supplier.name }}</td>
                    <td style="text-align:right;">
                      <span class="font-mono" style="font-size:.82rem;"
                            [style.color]="sb.balance.usd > 0 ? 'var(--red)' : 'var(--text-dim)'">
                        {{ sb.balance.usd | currencyFormat:'USD' }}
                      </span>
                    </td>
                    <td style="text-align:right;">
                      <span class="font-mono" style="font-size:.82rem;"
                            [style.color]="sb.balance.lbp > 0 ? 'var(--red)' : 'var(--text-dim)'">
                        {{ sb.balance.lbp | currencyFormat:'LBP' }}
                      </span>
                    </td>
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
export class ReportsComponent implements OnInit {
  private generateReport = inject(GenerateReportUseCase);

  loading = signal(false);
  report = signal<ReportResult | null>(null);
  preset = signal<Preset>('this-month');

  exchangeRate: number | null = null;
  combinedUsdNet = signal<number | null>(null);
  customFrom = '';
  customTo = '';

  presets: { value: Preset; label: string }[] = [
    { value: 'this-month', label: 'This Month' },
    { value: 'last-month', label: 'Last Month' },
    { value: 'this-week', label: 'This Week' },
    { value: 'custom', label: 'Custom' },
  ];

  async ngOnInit() { await this.loadReport(); }

  selectPreset(p: Preset) {
    this.preset.set(p);
    if (p !== 'custom') this.loadReport();
  }

  async loadReport() {
    const range = this.getRange();
    if (!range) return;
    this.loading.set(true);
    const result = await this.generateReport.execute(range);
    this.report.set(result);
    this.combinedUsdNet.set(null);
    this.loading.set(false);
  }

  onRateChange() {
    const r = this.report();
    if (!r || !this.exchangeRate || this.exchangeRate <= 0) {
      this.combinedUsdNet.set(null);
      return;
    }
    this.combinedUsdNet.set(r.netBalance.usd + r.netBalance.lbp / this.exchangeRate);
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
