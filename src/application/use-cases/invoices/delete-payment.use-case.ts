import { inject, Injectable } from '@angular/core';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';

@Injectable({ providedIn: 'root' })
export class DeletePaymentUseCase {
  private paymentRepo = inject(PaymentRepository);
  execute(id: string): Promise<void> { return this.paymentRepo.delete(id); }
}
