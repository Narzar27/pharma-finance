import { InvoiceStatus } from '../models/invoice.model';

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
