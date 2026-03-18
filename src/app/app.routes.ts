import { Routes } from '@angular/router';
import { authGuard } from '../presentation/core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('../presentation/features/auth/login/login.component').then(
        (m) => m.LoginComponent
      ),
  },
  {
    path: '',
    loadComponent: () =>
      import('../presentation/core/layout/app-shell/app-shell.component').then(
        (m) => m.AppShellComponent
      ),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('../presentation/features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'suppliers',
        loadComponent: () =>
          import('../presentation/features/suppliers/suppliers.component').then(
            (m) => m.SuppliersComponent
          ),
      },
      {
        path: 'invoices',
        loadComponent: () =>
          import('../presentation/features/invoices/invoices.component').then(
            (m) => m.InvoicesComponent
          ),
      },
      {
        path: 'invoices/:id',
        loadComponent: () =>
          import('../presentation/features/invoices/details/invoice-detail.component').then(
            (m) => m.InvoiceDetailComponent
          ),
      },
      {
        path: 'income',
        loadComponent: () =>
          import('../presentation/features/income/income.component').then(
            (m) => m.IncomeComponent
          ),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('../presentation/features/reports/reports.component').then(
            (m) => m.ReportsComponent
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
