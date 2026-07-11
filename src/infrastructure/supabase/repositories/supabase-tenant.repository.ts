import { Injectable } from '@angular/core';
import { TenantRepository } from '../../../domain/repositories/tenant.repository';
import { Tenant } from '../../../domain/models/tenant.model';
import { getSupabaseClient } from '../supabase.client';

@Injectable({ providedIn: 'root' })
export class SupabaseTenantRepository extends TenantRepository {
  private get db() { return getSupabaseClient(); }

  async getById(id: string): Promise<Tenant | null> {
    const { data, error } = await this.db.from('tenants').select('*').eq('id', id).single();
    if (error) return null;
    return this.map(data);
  }

  private map(row: any): Tenant {
    return { id: row.id, name: row.name, status: row.status, createdAt: row.created_at };
  }
}
