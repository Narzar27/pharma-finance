import {
  Component, ChangeDetectionStrategy, inject, signal, OnInit
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TopBarComponent } from '../../core/layout/top-bar/top-bar.component';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { CurrencyBadgeComponent } from '../../shared/components/currency-badge/currency-badge.component';
import { ListInvoicesUseCase } from '../../../application/use-cases/invoices/list-invoices.use-case';
import { CreateInvoiceUseCase } from '../../../application/use-cases/invoices/create-invoice.use-case';
import { DeleteInvoiceUseCase } from '../../../application/use-cases/invoices/delete-invoice.use-case';
import { ListSuppliersUseCase } from '../../../application/use-cases/suppliers/list-suppliers.use-case';
import { Invoice, Currency } from '../../../domain/models/invoice.model';
import { Supplier } from '../../../domain/models/supplier.model';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { isOverdue } from '../../../domain/services/invoice-status.service';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [FormsModule, RouterLink, TopBarComponent, CurrencyFormatPipe, StatusBadgeComponent, CurrencyBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './invoices.component.html',
  styleUrl: './invoices.component.scss',
})
export class InvoicesComponent implements OnInit {
  private listInvoices = inject(ListInvoicesUseCase);
  private createInvoice = inject(CreateInvoiceUseCase);
  private deleteInvoice = inject(DeleteInvoiceUseCase);
  private listSuppliers = inject(ListSuppliersUseCase);
  private paymentRepo = inject(PaymentRepository);

  loading = signal(true);
  saving = signal(false);
  showForm = signal(false);
  deletingId = signal<string | null>(null);
  invoices = signal<Invoice[]>([]);
  filtered = signal<Invoice[]>([]);
  suppliers = signal<Supplier[]>([]);
  private paymentTotals = new Map<string, { usd: number; lbp: number }>();

  filterStatus = '';
  filterCurrency = '';
  filterSupplier = '';

  isOverdue = isOverdue;

  form = {
    supplierId: '',
    amount: 0,
    currency: 'USD' as Currency,
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    notes: '',
  };

  async ngOnInit() {
    const [invoices, suppliers, totals] = await Promise.all([
      this.listInvoices.execute(),
      this.listSuppliers.execute(),
      this.paymentRepo.getAllTotals(),
    ]);
    this.paymentTotals = totals;
    this.invoices.set(invoices);
    this.filtered.set(invoices);
    this.suppliers.set(suppliers);
    this.loading.set(false);
  }

  remaining(inv: Invoice): number {
    const paid = this.paymentTotals.get(inv.id);
    if (!paid) return inv.amount;
    const paidInCurrency = inv.currency === 'USD' ? paid.usd : paid.lbp;
    return Math.max(0, inv.amount - paidInCurrency);
  }

  applyFilter() {
    this.filtered.set(
      this.invoices().filter(inv => {
        if (this.filterStatus && inv.status !== this.filterStatus) return false;
        if (this.filterCurrency && inv.currency !== this.filterCurrency) return false;
        if (this.filterSupplier && inv.supplierId !== this.filterSupplier) return false;
        return true;
      })
    );
  }

  async onSubmit() {
    if (!this.form.supplierId || !this.form.amount || !this.form.dueDate) return;
    this.saving.set(true);
    await this.createInvoice.execute({
      supplierId: this.form.supplierId,
      amount: this.form.amount,
      currency: this.form.currency,
      issueDate: this.form.issueDate,
      dueDate: this.form.dueDate,
      notes: this.form.notes || undefined,
    });
    this.saving.set(false);
    this.showForm.set(false);
    const [invoices, totals] = await Promise.all([
      this.listInvoices.execute(),
      this.paymentRepo.getAllTotals(),
    ]);
    this.paymentTotals = totals;
    this.invoices.set(invoices);
    this.applyFilter();
  }

  async confirmDelete(id: string) {
    await this.deleteInvoice.execute(id);
    this.deletingId.set(null);
    const [invoices, totals] = await Promise.all([
      this.listInvoices.execute(),
      this.paymentRepo.getAllTotals(),
    ]);
    this.paymentTotals = totals;
    this.invoices.set(invoices);
    this.applyFilter();
  }

  closeIfBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) this.showForm.set(false);
  }
}
