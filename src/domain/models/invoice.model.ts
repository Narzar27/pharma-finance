export type Currency = 'USD' | 'LBP';
export type InvoiceStatus = 'unpaid' | 'partial' | 'paid';

export interface Invoice {
  id: string;
  supplierId: string;
  supplierName?: string;
  amount: number;
  currency: Currency;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  notes?: string;
  createdAt: string;
}

export interface CreateInvoiceDto {
  supplierId: string;
  amount: number;
  currency: Currency;
  issueDate: string;
  dueDate: string;
  notes?: string;
}

export interface InvoiceFilter {
  supplierId?: string;
  status?: InvoiceStatus;
  currency?: Currency;
  dateFrom?: string;
  dateTo?: string;
}
