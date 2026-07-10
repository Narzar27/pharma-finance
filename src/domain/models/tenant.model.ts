export type TenantStatus = 'pending' | 'active' | 'rejected';

export interface Tenant {
  id: string;
  name: string;
  status: TenantStatus;
  createdAt: string;
}
