import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { ThemeService } from '../../../core/theme/theme.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  theme = inject(ThemeService);

  constructor() {
    this.auth.sessionReady.then(() => {
      if (this.auth.isAuthenticated()) this.router.navigate(['/']);
    });
  }

  email = '';
  password = '';
  loading = signal(false);
  loadingGoogle = signal(false);
  error = signal('');

  features = [
    { label: 'Track USD & LBP invoices separately', icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>` },
    { label: 'Never miss a payment due date', icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>` },
    { label: 'Per-supplier balance overview', icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2.5" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>` },
    { label: 'Monthly income vs expense reports', icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>` },
  ];

  async onGoogleSignIn() {
    this.loadingGoogle.set(true);
    this.error.set('');
    const { error } = await this.auth.signInWithGoogle();
    if (error) {
      this.error.set(error.message);
      this.loadingGoogle.set(false);
    }
    // on success Supabase redirects the browser — no need to navigate manually
  }

  async onSubmit() {
    this.loading.set(true);
    this.error.set('');
    const { error } = await this.auth.signIn(this.email, this.password);
    this.loading.set(false);
    if (error) this.error.set(error.message);
    else this.router.navigate(['/']);
  }
}
