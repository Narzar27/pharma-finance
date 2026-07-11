export type TenantStatus = 'pending' | 'active' | 'rejected';

export interface Tenant {
  id: string;
  name: string;
  status: TenantStatus;
  createdAt: string;
  /** Pre-fills the exchange-rate field on cross-currency invoice payments.
   *  Still overridable per payment; never used to auto-convert anything. */
  defaultExchangeRate?: number;
}
