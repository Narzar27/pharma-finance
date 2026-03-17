import { inject, Injectable } from '@angular/core';
import { SupplierRepository } from '../../../domain/repositories/supplier.repository';
import { Supplier } from '../../../domain/models/supplier.model';

@Injectable({ providedIn: 'root' })
export class ListSuppliersUseCase {
  private repo = inject(SupplierRepository);

  execute(): Promise<Supplier[]> {
    return this.repo.getAll();
  }
}
