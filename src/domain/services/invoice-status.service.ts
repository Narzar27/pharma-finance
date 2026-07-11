import { Currency, InvoiceStatus } from '../models/invoice.model';
import { Payment } from '../models/payment.model';

/**
 * Pure domain logic: determines invoice status based on amount paid vs total.
 * No framework dependencies.
 */
export function calculateInvoiceStatus(
  invoiceAmount: number,
  totalPaid: number
): InvoiceStatus {
  if (totalPaid <= 0) return 'unpaid';
  if (totalPaid >= invoiceAmount) return 'paid';
  return 'partial';
}

export function isOverdue(dueDateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(dueDateStr);
  return dueDate < today;
}

export function isDueSoon(dueDateStr: string, daysAhead: number): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const threshold = new Date(today);
  threshold.setDate(threshold.getDate() + daysAhead);
  const dueDate = new Date(dueDateStr);
  return dueDate >= today && dueDate <= threshold;
}

/**
 * How much of an invoice (in the invoice's own currency) a payment covers.
 * Same-currency payments count at face value; a cross-currency payment
 * requires its own exchangeRate (1 unit of the payment's currency = N
 * units of the invoice's currency) and contributes 0 if that rate is
 * missing, so a malformed cross-currency payment can never silently
 * count as full/partial payment.
 */
export function toInvoiceCurrency(
  payment: Pick<Payment, 'amountPaid' | 'currency' | 'exchangeRate'>,
  invoiceCurrency: Currency
): number {
  if (payment.currency === invoiceCurrency) return payment.amountPaid;
  if (!payment.exchangeRate) return 0;
  return payment.amountPaid * payment.exchangeRate;
}
