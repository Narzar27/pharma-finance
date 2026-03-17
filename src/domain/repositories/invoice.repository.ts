import { Invoice, CreateInvoiceDto, InvoiceFilter, InvoiceStatus } from '../models/invoice.model';

export abstract class InvoiceRepository {
  abstract getAll(filter?: InvoiceFilter): Promise<Invoice[]>;
  abstract getById(id: string): Promise<Invoice | null>;
  abstract create(dto: CreateInvoiceDto): Promise<Invoice>;
  abstract updateStatus(id: string, status: InvoiceStatus): Promise<void>;
  abstract delete(id: string): Promise<void>;
  abstract getOverdue(): Promise<Invoice[]>;
  abstract getDueSoon(daysAhead: number): Promise<Invoice[]>;
}
