import {
  Component, ChangeDetectionStrategy, inject, signal, OnInit
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TopBarComponent } from '../../core/layout/top-bar/top-bar.component';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { ListSuppliersUseCase } from '../../../application/use-cases/suppliers/list-suppliers.use-case';
import { CreateSupplierUseCase } from '../../../application/use-cases/suppliers/create-supplier.use-case';
import { GetSupplierBalanceUseCase } from '../../../application/use-cases/suppliers/get-supplier-balance.use-case';
import { Supplier } from '../../../domain/models/supplier.model';

interface SupplierWithBalance {
  supplier: Supplier;
  unpaidUsd: number;
  unpaidLbp: number;
}

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [FormsModule, TopBarComponent, CurrencyFormatPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-top-bar title="Suppliers">
      <button (click)="showForm.set(true)"
              style="padding:7px 14px; border-radius:8px; font-size:0.78rem; font-weight:600; border:none; cursor:pointer; background:linear-gradient(135deg,#d4a853,#b8923f); color:#08111a;">
        + Add Supplier
      </button>
    </app-top-bar>

    <div style="padding:28px;" class="fade-up">

      <!-- Add form modal -->
      @if (showForm()) {
        <div style="position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:rgba(8,17,26,0.8);">
          <div style="background:#16222e;border:1px solid #243a50;border-radius:12px;padding:28px;width:100%;max-width:420px;" class="fade-up">
            <h3 style="font-family:'DM Serif Display',serif;font-size:1.1rem;color:#e8edf2;margin:0 0 20px;font-weight:400;">New Supplier</h3>
            <form (ngSubmit)="onSubmit()">
              <div style="margin-bottom:16px;">
                <label style="display:block;font-size:0.72rem;font-weight:500;color:#7a8f9e;letter-spacing:0.07em;text-transform:uppercase;margin-bottom:6px;">Company Name *</label>
                <input type="text" [(ngModel)]="form.name" name="name" required
                       style="width:100%;background:#1c2f40;border:1px solid #243a50;border-radius:8px;padding:9px 12px;font-size:0.875rem;color:#e8edf2;outline:none;" />
              </div>
              <div style="margin-bottom:16px;">
                <label style="display:block;font-size:0.72rem;font-weight:500;color:#7a8f9e;letter-spacing:0.07em;text-transform:uppercase;margin-bottom:6px;">Contact Info</label>
                <input type="text" [(ngModel)]="form.contactInfo" name="contactInfo"
                       style="width:100%;background:#1c2f40;border:1px solid #243a50;border-radius:8px;padding:9px 12px;font-size:0.875rem;color:#e8edf2;outline:none;" />
              </div>
              <div style="margin-bottom:20px;">
                <label style="display:block;font-size:0.72rem;font-weight:500;color:#7a8f9e;letter-spacing:0.07em;text-transform:uppercase;margin-bottom:6px;">Notes</label>
                <textarea [(ngModel)]="form.notes" name="notes" rows="2"
                          style="width:100%;background:#1c2f40;border:1px solid #243a50;border-radius:8px;padding:9px 12px;font-size:0.875rem;color:#e8edf2;outline:none;resize:vertical;"></textarea>
              </div>
              <div style="display:flex;gap:10px;justify-content:flex-end;">
                <button type="button" (click)="showForm.set(false)"
                        style="padding:8px 16px;border-radius:8px;font-size:0.8rem;font-weight:500;border:1px solid #243a50;background:none;color:#7a8f9e;cursor:pointer;">
                  Cancel
                </button>
                <button type="submit" [disabled]="saving()"
                        style="padding:8px 16px;border-radius:8px;font-size:0.8rem;font-weight:600;border:none;cursor:pointer;background:linear-gradient(135deg,#d4a853,#b8923f);color:#08111a;">
                  {{ saving() ? 'Saving...' : 'Save Supplier' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Supplier cards -->
      @if (loading()) {
        <div style="color:#4a6070;font-size:0.875rem;padding:48px;text-align:center;">Loading suppliers...</div>
      } @else if (suppliers().length === 0) {
        <div style="text-align:center;padding:64px;color:#4a6070;">
          <p style="font-size:0.875rem;">No suppliers yet. Add your first pharmaceutical company.</p>
        </div>
      } @else {
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">
          @for (item of suppliers(); track item.supplier.id; let i = $index) {
            <div [class]="'fade-up fade-up-' + ((i % 5) + 1)"
                 style="background:#16222e;border:1px solid #243a50;border-radius:12px;padding:20px;">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;">
                <div>
                  <h3 style="font-family:'DM Serif Display',serif;font-size:1rem;color:#e8edf2;margin:0;font-weight:400;">{{ item.supplier.name }}</h3>
                  @if (item.supplier.contactInfo) {
                    <p style="font-size:0.75rem;color:#7a8f9e;margin:4px 0 0;">{{ item.supplier.contactInfo }}</p>
                  }
                </div>
                <div style="width:8px;height:8px;border-radius:50%;background:#27ae60;margin-top:6px;"></div>
              </div>
              <div style="border-top:1px solid #1c2f40;padding-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div>
                  <p style="font-size:0.68rem;color:#4a6070;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 3px;">Owed (USD)</p>
                  <p class="num" style="font-size:0.875rem;font-weight:500;color:{{ item.unpaidUsd > 0 ? '#e74c3c' : '#4a6070' }};margin:0;">
                    {{ item.unpaidUsd | currencyFormat:'USD' }}
                  </p>
                </div>
                <div>
                  <p style="font-size:0.68rem;color:#4a6070;text-transform:uppercase;letter-spacing:0.07em;margin:0 0 3px;">Owed (LBP)</p>
                  <p class="num" style="font-size:0.875rem;font-weight:500;color:{{ item.unpaidLbp > 0 ? '#e74c3c' : '#4a6070' }};margin:0;">
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

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.loading.set(true);
    const list = await this.listSuppliers.execute();
    const withBalances = await Promise.all(
      list.map(async (supplier) => {
        const balance = await this.getBalance.execute(supplier.id);
        return { supplier, unpaidUsd: balance.unpaidUsd, unpaidLbp: balance.unpaidLbp };
      })
    );
    this.suppliers.set(withBalances);
    this.loading.set(false);
  }

  async onSubmit() {
    if (!this.form.name.trim()) return;
    this.saving.set(true);
    await this.createSupplier.execute({
      name: this.form.name,
      contactInfo: this.form.contactInfo || undefined,
      notes: this.form.notes || undefined,
    });
    this.form = { name: '', contactInfo: '', notes: '' };
    this.saving.set(false);
    this.showForm.set(false);
    await this.load();
  }
}
