import { Injectable } from '@angular/core';
import { InvoiceRepository } from '../../../domain/repositories/invoice.repository';
import { Invoice, CreateInvoiceDto, InvoiceFilter, InvoiceStatus } from '../../../domain/models/invoice.model';
import { getSupabaseClient } from '../supabase.client';

@Injectable({ providedIn: 'root' })
export class SupabaseInvoiceRepository extends InvoiceRepository {
  private get db() { return getSupabaseClient(); }

  async getAll(filter?: InvoiceFilter): Promise<Invoice[]> {
    let query = this.db
      .from('invoices')
      .select('*, suppliers(name)')
      .order('due_date', { ascending: true });

    if (filter?.supplierId) query = query.eq('supplier_id', filter.supplierId);
    if (filter?.status) query = query.eq('status', filter.status);
    if (filter?.currency) query = query.eq('currency', filter.currency);
    if (filter?.dateFrom) query = query.gte('due_date', filter.dateFrom);
    if (filter?.dateTo) query = query.lte('due_date', filter.dateTo);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(this.map);
  }

  async getById(id: string): Promise<Invoice | null> {
    const { data, error } = await this.db
      .from('invoices')
      .select('*, suppliers(name)')
      .eq('id', id)
      .single();
    if (error) return null;
    return this.map(data);
  }

  async create(dto: CreateInvoiceDto): Promise<Invoice> {
    const { data, error } = await this.db
      .from('invoices')
      .insert({
        supplier_id: dto.supplierId,
        amount: dto.amount,
        currency: dto.currency,
        issue_date: dto.issueDate,
        due_date: dto.dueDate,
        notes: dto.notes,
      })
      .select('*, suppliers(name)')
      .single();
    if (error) throw error;
    return this.map(data);
  }

  async updateStatus(id: string, status: InvoiceStatus): Promise<void> {
    const { error } = await this.db
      .from('invoices')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
  }

  async getOverdue(): Promise<Invoice[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await this.db
      .from('invoices')
      .select('*, suppliers(name)')
      .in('status', ['unpaid', 'partial'])
      .lt('due_date', today)
      .order('due_date');
    if (error) throw error;
    return (data ?? []).map(this.map);
  }

  async getDueSoon(daysAhead: number): Promise<Invoice[]> {
    const today = new Date().toISOString().split('T')[0];
    const future = new Date();
    future.setDate(future.getDate() + daysAhead);
    const futureStr = future.toISOString().split('T')[0];

    const { data, error } = await this.db
      .from('invoices')
      .select('*, suppliers(name)')
      .in('status', ['unpaid', 'partial'])
      .gte('due_date', today)
      .lte('due_date', futureStr)
      .order('due_date');
    if (error) throw error;
    return (data ?? []).map(this.map);
  }

  private map(row: any): Invoice {
    return {
      id: row.id,
      supplierId: row.supplier_id,
      supplierName: row.suppliers?.name,
      amount: Number(row.amount),
      currency: row.currency,
      issueDate: row.issue_date,
      dueDate: row.due_date,
      status: row.status,
      notes: row.notes,
      createdAt: row.created_at,
    };
  }
}
