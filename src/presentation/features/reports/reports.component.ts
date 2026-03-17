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

    <div style="padding:28px;" class="fade-up">

      <!-- Date range controls -->
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:24px;flex-wrap:wrap;">
        @for (p of presets; track p.value) {
          <button (click)="selectPreset(p.value)"
                  [style.background]="preset() === p.value ? 'linear-gradient(135deg,#d4a853,#b8923f)' : '#16222e'"
                  [style.color]="preset() === p.value ? '#08111a' : '#7a8f9e'"
                  [style.borderColor]="preset() === p.value ? 'transparent' : '#243a50'"
                  style="padding:7px 14px;border-radius:8px;font-size:0.78rem;font-weight:500;border:1px solid;cursor:pointer;">
            {{ p.label }}
          </button>
        }
        @if (preset() === 'custom') {
          <input type="date" [(ngModel)]="customFrom" (ngModelChange)="loadReport()"
                 style="background:#16222e;border:1px solid #243a50;border-radius:8px;padding:7px 12px;font-size:0.78rem;color:#e8edf2;outline:none;font-family:'JetBrains Mono',monospace;" />
          <span style="color:#4a6070;font-size:0.8rem;">to</span>
          <input type="date" [(ngModel)]="customTo" (ngModelChange)="loadReport()"
                 style="background:#16222e;border:1px solid #243a50;border-radius:8px;padding:7px 12px;font-size:0.78rem;color:#e8edf2;outline:none;font-family:'JetBrains Mono',monospace;" />
        }
      </div>

      @if (loading()) {
        <p style="color:#4a6070;font-size:0.875rem;padding:32px 0;">Generating report...</p>
      } @else if (report()) {

        <!-- Income vs Expenses cards -->
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-bottom:28px;">
          <div class="fade-up fade-up-1" style="background:#16222e;border:1px solid #243a50;border-radius:12px;padding:20px;">
            <p style="font-size:0.68rem;font-weight:500;color:#7a8f9e;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px;">Income (USD)</p>
            <p class="num" style="font-size:1.3rem;font-weight:600;color:#27ae60;margin:0;">{{ report()!.totalIncome.usd | currencyFormat:'USD' }}</p>
          </div>
          <div class="fade-up fade-up-1" style="background:#16222e;border:1px solid #243a50;border-radius:12px;padding:20px;">
            <p style="font-size:0.68rem;font-weight:500;color:#7a8f9e;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px;">Income (LBP)</p>
            <p class="num" style="font-size:1.3rem;font-weight:600;color:#27ae60;margin:0;">{{ report()!.totalIncome.lbp | currencyFormat:'LBP' }}</p>
          </div>
          <div class="fade-up fade-up-2" style="background:#16222e;border:1px solid #243a50;border-radius:12px;padding:20px;">
            <p style="font-size:0.68rem;font-weight:500;color:#7a8f9e;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px;">Expenses (USD)</p>
            <p class="num" style="font-size:1.3rem;font-weight:600;color:#e74c3c;margin:0;">{{ report()!.totalExpenses.usd | currencyFormat:'USD' }}</p>
          </div>
          <div class="fade-up fade-up-2" style="background:#16222e;border:1px solid #243a50;border-radius:12px;padding:20px;">
            <p style="font-size:0.68rem;font-weight:500;color:#7a8f9e;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px;">Expenses (LBP)</p>
            <p class="num" style="font-size:1.3rem;font-weight:600;color:#e74c3c;margin:0;">{{ report()!.totalExpenses.lbp | currencyFormat:'LBP' }}</p>
          </div>
          <div class="fade-up fade-up-3" style="background:#16222e;border:1px solid #243a50;border-radius:12px;padding:20px;">
            <p style="font-size:0.68rem;font-weight:500;color:#7a8f9e;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px;">Net (USD)</p>
            <p class="num" style="font-size:1.3rem;font-weight:600;margin:0;"
               [style.color]="report()!.netBalance.usd >= 0 ? '#27ae60' : '#e74c3c'">
              {{ report()!.netBalance.usd | currencyFormat:'USD' }}
            </p>
          </div>
          <div class="fade-up fade-up-3" style="background:#16222e;border:1px solid #243a50;border-radius:12px;padding:20px;">
            <p style="font-size:0.68rem;font-weight:500;color:#7a8f9e;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 6px;">Net (LBP)</p>
            <p class="num" style="font-size:1.3rem;font-weight:600;margin:0;"
               [style.color]="report()!.netBalance.lbp >= 0 ? '#27ae60' : '#e74c3c'">
              {{ report()!.netBalance.lbp | currencyFormat:'LBP' }}
            </p>
          </div>
        </div>

        <!-- Exchange rate converter -->
        <div class="fade-up fade-up-4" style="background:#16222e;border:1px solid #243a50;border-radius:12px;padding:20px;margin-bottom:24px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
          <p style="font-size:0.8rem;color:#7a8f9e;margin:0;white-space:nowrap;">Optional: Exchange rate</p>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:0.8rem;color:#4a6070;">1 USD =</span>
            <input type="number" [(ngModel)]="exchangeRate" (ngModelChange)="onRateChange()" min="0" step="1000" placeholder="e.g. 89500"
                   style="background:#1c2f40;border:1px solid #243a50;border-radius:8px;padding:7px 12px;font-size:0.82rem;color:#e8edf2;outline:none;font-family:'JetBrains Mono',monospace;width:130px;" />
            <span style="font-size:0.8rem;color:#4a6070;">LL</span>
          </div>
          @if (combinedUsdNet() !== null) {
            <div style="margin-left:auto;text-align:right;">
              <p style="font-size:0.68rem;color:#7a8f9e;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 3px;">Combined Net (USD equiv.)</p>
              <p class="num" style="font-size:1.1rem;font-weight:600;margin:0;"
                 [style.color]="combinedUsdNet()! >= 0 ? '#27ae60' : '#e74c3c'">
                {{ combinedUsdNet()! | currencyFormat:'USD' }}
              </p>
            </div>
          }
        </div>

        <!-- Per-supplier balances -->
        @if (report()!.supplierBalances.length > 0) {
          <div class="fade-up fade-up-5" style="background:#16222e;border:1px solid #243a50;border-radius:12px;overflow:hidden;">
            <div style="padding:16px 20px;border-bottom:1px solid #1c2f40;">
              <h3 style="font-family:'DM Serif Display',serif;font-size:1rem;color:#e8edf2;margin:0;font-weight:400;">Outstanding Balances by Supplier</h3>
            </div>
            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr style="border-bottom:1px solid #1c2f40;">
                  <th style="padding:9px 20px;text-align:left;font-size:0.68rem;font-weight:500;color:#4a6070;letter-spacing:0.08em;text-transform:uppercase;">Supplier</th>
                  <th style="padding:9px 12px;text-align:right;font-size:0.68rem;font-weight:500;color:#4a6070;letter-spacing:0.08em;text-transform:uppercase;">Owed (USD)</th>
                  <th style="padding:9px 20px 9px 12px;text-align:right;font-size:0.68rem;font-weight:500;color:#4a6070;letter-spacing:0.08em;text-transform:uppercase;">Owed (LBP)</th>
                </tr>
              </thead>
              <tbody>
                @for (sb of report()!.supplierBalances; track sb.supplier.id) {
                  <tr style="border-bottom:1px solid #1c2f40;">
                    <td style="padding:11px 20px;font-size:0.82rem;color:#e8edf2;">{{ sb.supplier.name }}</td>
                    <td style="padding:11px 12px;text-align:right;">
                      <span class="num" style="font-size:0.82rem;"
                            [style.color]="sb.balance.usd > 0 ? '#e74c3c' : '#4a6070'">
                        {{ sb.balance.usd | currencyFormat:'USD' }}
                      </span>
                    </td>
                    <td style="padding:11px 20px 11px 12px;text-align:right;">
                      <span class="num" style="font-size:0.82rem;"
                            [style.color]="sb.balance.lbp > 0 ? '#e74c3c' : '#4a6070'">
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

  async ngOnInit() {
    await this.loadReport();
  }

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
    const combined = r.netBalance.usd + r.netBalance.lbp / this.exchangeRate;
    this.combinedUsdNet.set(combined);
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
