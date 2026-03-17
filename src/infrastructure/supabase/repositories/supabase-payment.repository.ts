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
