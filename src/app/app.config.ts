import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

// Repository abstractions
import { SupplierRepository } from '../domain/repositories/supplier.repository';
import { InvoiceRepository } from '../domain/repositories/invoice.repository';
import { PaymentRepository } from '../domain/repositories/payment.repository';
import { IncomeRecordRepository } from '../domain/repositories/income-record.repository';

// Supabase implementations
import { SupabaseSupplierRepository } from '../infrastructure/supabase/repositories/supabase-supplier.repository';
import { SupabaseInvoiceRepository } from '../infrastructure/supabase/repositories/supabase-invoice.repository';
import { SupabasePaymentRepository } from '../infrastructure/supabase/repositories/supabase-payment.repository';
import { SupabaseIncomeRecordRepository } from '../infrastructure/supabase/repositories/supabase-income-record.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // Bind repository abstractions to Supabase implementations
    { provide: SupplierRepository, useClass: SupabaseSupplierRepository },
    { provide: InvoiceRepository, useClass: SupabaseInvoiceRepository },
    { provide: PaymentRepository, useClass: SupabasePaymentRepository },
    { provide: IncomeRecordRepository, useClass: SupabaseIncomeRecordRepository },
  ],
};
