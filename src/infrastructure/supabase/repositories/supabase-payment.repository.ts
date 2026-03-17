import { Injectable } from '@angular/core';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { Payment, CreatePaymentDto } from '../../../domain/models/payment.model';
import { getSupabaseClient } from '../supabase.client';

@Injectable({ providedIn: 'root' })
export class SupabasePaymentRepository extends PaymentRepository {
  private get db() { return getSupabaseClient(); }

  async getByInvoiceId(invoiceId: string): Promise<Payment[]> {
    const { data, error } = await this.db
      .from('payments')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('payment_date', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(this.map);
  }

  async create(dto: CreatePaymentDto): Promise<Payment> {
    const { data, error } = await this.db
      .from('payments')
      .insert({
        invoice_id: dto.invoiceId,
        amount_paid: dto.amountPaid,
        currency: dto.currency,
        payment_date: dto.paymentDate,
        notes: dto.notes,
      })
      .select()
      .single();
    if (error) throw error;
    return this.map(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.db.from('payments').delete().eq('id', id);
    if (error) throw error;
  }

  async getTotalPaidForInvoice(invoiceId: string): Promise<{ usd: number; lbp: number }> {
    const { data, error } = await this.db
      .from('payments')
      .select('amount_paid, currency')
      .eq('invoice_id', invoiceId);
    if (error) throw error;

    return (data ?? []).reduce(
      (acc, row) => {
        if (row.currency === 'USD') acc.usd += Number(row.amount_paid);
        else acc.lbp += Number(row.amount_paid);
        return acc;
      },
      { usd: 0, lbp: 0 }
    );
  }

  async getAllTotals(): Promise<Map<string, { usd: number; lbp: number }>> {
    const { data, error } = await this.db
      .from('payments')
      .select('invoice_id, amount_paid, currency');
    if (error) throw error;

    const map = new Map<string, { usd: number; lbp: number }>();
    for (const row of data ?? []) {
      const entry = map.get(row.invoice_id) ?? { usd: 0, lbp: 0 };
      if (row.currency === 'USD') entry.usd += Number(row.amount_paid);
      else entry.lbp += Number(row.amount_paid);
      map.set(row.invoice_id, entry);
    }
    return map;
  }

  private map(row: any): Payment {
    return {
      id: row.id,
      invoiceId: row.invoice_id,
      amountPaid: Number(row.amount_paid),
      currency: row.currency,
      paymentDate: row.payment_date,
      notes: row.notes,
      createdAt: row.created_at,
    };
  }
}
