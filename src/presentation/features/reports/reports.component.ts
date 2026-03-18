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
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.scss',
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
