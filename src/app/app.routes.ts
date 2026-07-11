import { Routes } from '@angular/router';
import { tenantAccessGuard } from '../presentation/core/auth/tenant-access.guard';
import { platformAdminGuard } from '../presentation/core/auth/platform-admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('../presentation/features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('../presentation/features/auth/signup/signup.component').then((m) => m.SignupComponent),
  },
  {
    path: 'pending',
    loadComponent: () =>
      import('../presentation/features/auth/pending/pending.component').then((m) => m.PendingComponent),
  },
  {
    path: 'rejected',
    loadComponent: () =>
      import('../presentation/features/auth/pending/pending.component').then((m) => m.PendingComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('../presentation/core/layout/app-shell/app-shell.component').then((m) => m.AppShellComponent),
    canActivate: [tenantAccessGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('../presentation/features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'suppliers',
        loadComponent: () =>
          import('../presentation/features/suppliers/suppliers.component').then((m) => m.SuppliersComponent),
      },
      {
        path: 'invoices',
        loadComponent: () =>
          import('../presentation/features/invoices/invoices.component').then((m) => m.InvoicesComponent),
      },
      {
        path: 'invoices/:id',
        loadComponent: () =>
          import('../presentation/features/invoices/details/invoice-detail.component').then((m) => m.InvoiceDetailComponent),
      },
      {
        path: 'income',
        loadComponent: () =>
          import('../presentation/features/income/income.component').then((m) => m.IncomeComponent),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('../presentation/features/reports/reports.component').then((m) => m.ReportsComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('../presentation/features/tenant/users/tenant-users.component').then((m) => m.TenantUsersComponent),
      },
      {
        path: 'admin/approvals',
        canActivate: [platformAdminGuard],
        loadComponent: () =>
          import('../presentation/features/admin/approvals/admin-approvals.component').then((m) => m.AdminApprovalsComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
