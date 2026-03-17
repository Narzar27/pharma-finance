import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopBarComponent } from '../../core/layout/top-bar/top-bar.component';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { ListSuppliersUseCase } from '../../../application/use-cases/suppliers/list-suppliers.use-case';
import { CreateSupplierUseCase } from '../../../application/use-cases/suppliers/create-supplier.use-case';
import { GetSupplierBalanceUseCase } from '../../../application/use-cases/suppliers/get-supplier-balance.use-case';
import { Supplier } from '../../../domain/models/supplier.model';

interface SupplierWithBalance { supplier: Supplier; unpaidUsd: number; unpaidLbp: number; }

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [FormsModule, TopBarComponent, CurrencyFormatPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-top-bar title="Suppliers">
      <button class="btn-primary" (click)="showForm.set(true)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add Supplier
      </button>
    </app-top-bar>

    <div style="padding:28px;">

      @if (showForm()) {
        <div class="modal-overlay" (click)="closeIfBackdrop($event)">
          <div class="modal modal-sm fade-up" (click)="$event.stopPropagation()">
            <h3 style="font-family:'DM Serif Display',serif;font-size:1.15rem;color:var(--text-primary);margin:0 0 20px;font-weight:400;">New Supplier</h3>
            <form (ngSubmit)="onSubmit()">
              <div style="margin-bottom:14px;">
                <label class="label">Company Name *</label>
                <input class="input" type="text" [(ngModel)]="form.name" name="name" required placeholder="e.g. Pharmaline" />
              </div>
              <div style="margin-bottom:14px;">
                <label class="label">Contact Info</label>
                <input class="input" type="text" [(ngModel)]="form.contactInfo" name="contactInfo" placeholder="Phone or email" />
              </div>
              <div style="margin-bottom:22px;">
                <label class="label">Notes</label>
                <textarea class="input" [(ngModel)]="form.notes" name="notes" rows="2" style="resize:vertical;" placeholder="Optional notes"></textarea>
              </div>
              <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button type="button" class="btn-ghost" (click)="showForm.set(false)">Cancel</button>
                <button type="submit" class="btn-primary" [disabled]="saving()">
                  {{ saving() ? 'Saving...' : 'Save Supplier' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      @if (loading()) {
        <div style="padding:56px;text-align:center;color:var(--text-dim);font-size:.875rem;">Loading suppliers...</div>
      } @else if (suppliers().length === 0) {
        <div style="text-align:center;padding:72px;color:var(--text-dim);">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 14px;display:block;opacity:.35;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          <p style="font-size:.875rem;margin:0 0 16px;">No suppliers yet</p>
          <button class="btn-primary" (click)="showForm.set(true)">Add your first supplier</button>
        </div>
      } @else {
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;">
          @for (item of suppliers(); track item.supplier.id; let i = $index) {
            <div class="card fade-up" [style.animation-delay]="(i * 0.05) + 's'" style="padding:20px;">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;">
                <div style="flex:1;min-width:0;">
                  <h3 style="font-family:'DM Serif Display',serif;font-size:1rem;color:var(--text-primary);margin:0 0 3px;font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ item.supplier.name }}</h3>
                  @if (item.supplier.contactInfo) {
                    <p style="font-size:.75rem;color:var(--text-secondary);margin:0;">{{ item.supplier.contactInfo }}</p>
                  }
                </div>
                <div style="width:8px;height:8px;border-radius:50%;background:var(--green);margin-top:6px;flex-shrink:0;box-shadow:0 0 6px var(--green);"></div>
              </div>
              <hr class="divider" style="margin-bottom:14px;" />
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div>
                  <p style="font-size:.65rem;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em;margin:0 0 3px;">Owed (USD)</p>
                  <p class="font-mono" style="font-size:.9rem;font-weight:600;margin:0;" [style.color]="item.unpaidUsd > 0 ? 'var(--red)' : 'var(--text-dim)'">
                    {{ item.unpaidUsd | currencyFormat:'USD' }}
                  </p>
                </div>
                <div>
                  <p style="font-size:.65rem;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:.07em;margin:0 0 3px;">Owed (LBP)</p>
                  <p class="font-mono" style="font-size:.9rem;font-weight:600;margin:0;" [style.color]="item.unpaidLbp > 0 ? 'var(--red)' : 'var(--text-dim)'">
                    {{ item.unpaidLbp | currencyFormat:'LBP' }}
                  </p>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class SuppliersComponent implements OnInit {
  private listSuppliers = inject(ListSuppliersUseCase);
  private createSupplier = inject(CreateSupplierUseCase);
  private getBalance = inject(GetSupplierBalanceUseCase);

  loading = signal(true);
  saving = signal(false);
  showForm = signal(false);
  suppliers = signal<SupplierWithBalance[]>([]);
  form = { name: '', contactInfo: '', notes: '' };

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading.set(true);
    const list = await this.listSuppliers.execute();
    const withBalances = await Promise.all(list.map(async s => {
      const b = await this.getBalance.execute(s.id);
      return { supplier: s, unpaidUsd: b.unpaidUsd, unpaidLbp: b.unpaidLbp };
    }));
    this.suppliers.set(withBalances);
    this.loading.set(false);
  }

  async onSubmit() {
    if (!this.form.name.trim()) return;
    this.saving.set(true);
    await this.createSupplier.execute({ name: this.form.name, contactInfo: this.form.contactInfo || undefined, notes: this.form.notes || undefined });
    this.form = { name: '', contactInfo: '', notes: '' };
    this.saving.set(false);
    this.showForm.set(false);
    await this.load();
  }

  closeIfBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) this.showForm.set(false);
  }
}
