import { inject, Injectable } from '@angular/core';
import { SupplierRepository } from '../../../domain/repositories/supplier.repository';
import { CreateSupplierDto, Supplier } from '../../../domain/models/supplier.model';

@Injectable({ providedIn: 'root' })
export class CreateSupplierUseCase {
  private repo = inject(SupplierRepository);

  execute(dto: CreateSupplierDto): Promise<Supplier> {
    return this.repo.create(dto);
  }
}
