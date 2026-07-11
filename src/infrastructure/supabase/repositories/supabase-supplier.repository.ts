import { Injectable } from '@angular/core';
import { SupplierRepository } from '../../../domain/repositories/supplier.repository';
import { Supplier, CreateSupplierDto } from '../../../domain/models/supplier.model';
import { getSupabaseClient } from '../supabase.client';

@Injectable({ providedIn: 'root' })
export class SupabaseSupplierRepository extends SupplierRepository {
  private get db() { return getSupabaseClient(); }

  async getAll(): Promise<Supplier[]> {
    const { data, error } = await this.db
      .from('suppliers')
      .select('*')
      .eq('archived', false)
      .order('name');
    if (error) throw error;
    return (data ?? []).map(this.map);
  }

  async getById(id: string): Promise<Supplier | null> {
    const { data, error } = await this.db
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return this.map(data);
  }

  async create(dto: CreateSupplierDto): Promise<Supplier> {
    const tenantId = await this.currentTenantId();
    const { data, error } = await this.db
      .from('suppliers')
      .insert({ tenant_id: tenantId, name: dto.name, contact_info: dto.contactInfo, notes: dto.notes })
      .select()
      .single();
    if (error) throw error;
    return this.map(data);
  }

  private async currentTenantId(): Promise<string> {
    const { data: userData } = await this.db.auth.getUser();
    const { data, error } = await this.db
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', userData.user?.id)
      .eq('status', 'active')
      .single();
    if (error || !data) throw new Error('No active business membership found.');
    return data.tenant_id;
  }

  async update(id: string, dto: Partial<CreateSupplierDto>): Promise<Supplier> {
    const { data, error } = await this.db
      .from('suppliers')
      .update({ name: dto.name, contact_info: dto.contactInfo, notes: dto.notes })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return this.map(data);
  }

  async archive(id: string): Promise<void> {
    const { error } = await this.db
      .from('suppliers')
      .update({ archived: true })
      .eq('id', id);
    if (error) throw error;
  }

  private map(row: any): Supplier {
    return {
      id: row.id,
      name: row.name,
      contactInfo: row.contact_info,
      notes: row.notes,
      archived: row.archived,
      createdAt: row.created_at,
    };
  }
}
