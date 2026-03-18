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
  templateUrl: './suppliers.component.html',
  styleUrl: './suppliers.component.scss',
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
