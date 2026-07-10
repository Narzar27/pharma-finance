import { Tenant } from '../models/tenant.model';

export abstract class TenantRepository {
  abstract getById(id: string): Promise<Tenant | null>;
}
