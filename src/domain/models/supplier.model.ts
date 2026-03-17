export interface Supplier {
  id: string;
  name: string;
  contactInfo?: string;
  notes?: string;
  archived: boolean;
  createdAt: string;
}

export interface CreateSupplierDto {
  name: string;
  contactInfo?: string;
  notes?: string;
}
