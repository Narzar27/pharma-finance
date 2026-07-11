import { Tenant } from '../models/tenant.model';

export abstract class TenantRepository {
  abstract getById(id: string): Promise<Tenant | null>;
  abstract rename(id: string, name: string): Promise<Tenant>;
  abstract setDefaultExchangeRate(id: string, rate: number | null): Promise<Tenant>;
}
