import { Injectable } from '@angular/core';
import { IncomeRecordRepository } from '../../../domain/repositories/income-record.repository';
import { IncomeRecord, CreateIncomeRecordDto } from '../../../domain/models/income-record.model';
import { getSupabaseClient } from '../supabase.client';

@Injectable({ providedIn: 'root' })
export class SupabaseIncomeRecordRepository extends IncomeRecordRepository {
  private get db() { return getSupabaseClient(); }

  async getAll(dateFrom?: string, dateTo?: string): Promise<IncomeRecord[]> {
    let query = this.db
      .from('income_records')
      .select('*')
      .order('date', { ascending: false });

    if (dateFrom) query = query.gte('date', dateFrom);
    if (dateTo) query = query.lte('date', dateTo);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(this.map);
  }

  async create(dto: CreateIncomeRecordDto): Promise<IncomeRecord> {
    const { data, error } = await this.db
      .from('income_records')
      .insert({
        amount: dto.amount,
        currency: dto.currency,
        date: dto.date,
        source: dto.source,
        notes: dto.notes,
      })
      .select()
      .single();
    if (error) throw error;
    return this.map(data);
  }

  async getTotals(dateFrom?: string, dateTo?: string): Promise<{ usd: number; lbp: number }> {
    let query = this.db.from('income_records').select('amount, currency');
    if (dateFrom) query = query.gte('date', dateFrom);
    if (dateTo) query = query.lte('date', dateTo);

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).reduce(
      (acc, row) => {
        if (row.currency === 'USD') acc.usd += Number(row.amount);
        else acc.lbp += Number(row.amount);
        return acc;
      },
      { usd: 0, lbp: 0 }
    );
  }

  private map(row: any): IncomeRecord {
    return {
      id: row.id,
      amount: Number(row.amount),
      currency: row.currency,
      date: row.date,
      source: row.source,
      notes: row.notes,
      createdAt: row.created_at,
    };
  }
}
