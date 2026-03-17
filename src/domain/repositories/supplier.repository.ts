import { Supplier, CreateSupplierDto } from '../models/supplier.model';

export abstract class SupplierRepository {
  abstract getAll(): Promise<Supplier[]>;
  abstract getById(id: string): Promise<Supplier | null>;
  abstract create(dto: CreateSupplierDto): Promise<Supplier>;
  abstract update(id: string, dto: Partial<CreateSupplierDto>): Promise<Supplier>;
  abstract archive(id: string): Promise<void>;
}
