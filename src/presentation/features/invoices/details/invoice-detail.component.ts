import {
  Component, ChangeDetectionStrategy, inject, signal, computed, OnInit
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TopBarComponent } from '../../../core/layout/top-bar/top-bar.component';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { CurrencyBadgeComponent } from '../../../shared/components/currency-badge/currency-badge.component';
import { GetInvoiceDetailUseCase, InvoiceDetail } from '../../../../application/use-cases/invoices/get-invoice-detail.use-case';
import { AddPaymentUseCase } from '../../../../application/use-cases/invoices/add-payment.use-case';
import { DeleteInvoiceUseCase } from '../../../../application/use-cases/invoices/delete-invoice.use-case';
import { DeletePaymentUseCase } from '../../../../application/use-cases/invoices/delete-payment.use-case';
import { GetTenantUseCase } from '../../../../application/use-cases/tenants/get-tenant.use-case';
import { CurrentTenantService } from '../../../core/tenant/current-tenant.service';
import { Currency } from '../../../../domain/models/invoice.model';
import { toInvoiceCurrency } from '../../../../domain/services/invoice-status.service';

@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  imports: [FormsModule, RouterLink, TopBarComponent, CurrencyFormatPipe, StatusBadgeComponent, CurrencyBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './invoice-detail.component.html',
  styleUrl: './invoice-detail.component.scss',
})
export class InvoiceDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private getDetail = inject(GetInvoiceDetailUseCase);
  private addPayment = inject(AddPaymentUseCase);
  private deleteInvoice = inject(DeleteInvoiceUseCase);
  private deletePayment = inject(DeletePaymentUseCase);
  private getTenant = inject(GetTenantUseCase);
  private currentTenant = inject(CurrentTenantService);

  loading = signal(true);
  addingPayment = signal(false);
  confirmDeleteInvoice = signal(false);
  deletingPaymentId = signal<string | null>(null);
  detail = signal<InvoiceDetail | null>(null);
  defaultExchangeRate: number | null = null;

  remaining = computed(() => {
    const d = this.detail();
    if (!d) return 0;
    const paid = d.payments.reduce((sum, p) => sum + toInvoiceCurrency(p, d.invoice.currency), 0);
    return Math.max(0, d.invoice.amount - paid);
  });

  payForm = {
    amount: 0,
    currency: 'USD' as Currency,
    paymentDate: new Date().toISOString().split('T')[0],
    exchangeRate: null as number | null,
    notes: '',
  };

  // Plain method, not computed(): payForm.currency is an ngModel-bound
  // property, not a signal, so a computed() here would never re-evaluate
  // after its first read.
  isCrossCurrency(): boolean {
    const invoiceCurrency = this.detail()?.invoice.currency;
    return !!invoiceCurrency && this.payForm.currency !== invoiceCurrency;
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    const result = await this.getDetail.execute(id);
    this.detail.set(result);
    if (result) this.payForm.currency = result.invoice.currency;

    const tenantId = this.currentTenant.membership()?.tenantId;
    if (tenantId) {
      const tenant = await this.getTenant.execute(tenantId);
      this.defaultExchangeRate = tenant?.defaultExchangeRate ?? null;
    }

    this.loading.set(false);
  }

  // Called when the payment currency changes — pre-fills the exchange
  // rate once cross-currency becomes relevant, still freely editable.
  onPayCurrencyChange() {
    if (this.isCrossCurrency() && !this.payForm.exchangeRate) {
      this.payForm.exchangeRate = this.defaultExchangeRate;
    }
  }

  async doDeleteInvoice() {
    const d = this.detail();
    if (!d) return;
    await this.deleteInvoice.execute(d.invoice.id);
    this.router.navigate(['/invoices']);
  }

  async confirmDeletePayment(paymentId: string) {
    const d = this.detail();
    if (!d) return;
    await this.deletePayment.execute(paymentId, d.invoice.id);
    this.deletingPaymentId.set(null);
    const updated = await this.getDetail.execute(d.invoice.id);
    this.detail.set(updated);
  }

  async onAddPayment() {
    const d = this.detail();
    if (!d || !this.payForm.amount) return;
    if (this.isCrossCurrency() && !this.payForm.exchangeRate) return;

    this.addingPayment.set(true);
    await this.addPayment.execute({
      invoiceId: d.invoice.id,
      amountPaid: this.payForm.amount,
      currency: this.payForm.currency,
      paymentDate: this.payForm.paymentDate,
      exchangeRate: this.isCrossCurrency() ? (this.payForm.exchangeRate ?? undefined) : undefined,
      notes: this.payForm.notes || undefined,
    });
    const updated = await this.getDetail.execute(d.invoice.id);
    this.detail.set(updated);
    this.payForm.amount = 0;
    this.payForm.exchangeRate = null;
    this.payForm.notes = '';
    this.addingPayment.set(false);
  }
}
