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
  template: `
    <div style="min-height:100vh; display:flex; background:var(--bg-base); transition:background .25s;">

      <!-- Left panel — branding -->
      <div style="flex:0 0 44%; display:flex; flex-direction:column; justify-content:space-between; padding:48px 52px; background:var(--bg-surface); border-right:1px solid var(--border); position:relative; overflow:hidden;">

        <!-- Decorative grid -->
        <div style="position:absolute;inset:0;pointer-events:none;opacity:.4;">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="g" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="var(--border)" stroke-width=".6"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#g)"/>
          </svg>
        </div>

        <!-- Ambient glow -->
        <div style="position:absolute;bottom:-80px;left:-80px;width:360px;height:360px;border-radius:50%;background:radial-gradient(circle,var(--gold-glow) 0%,transparent 70%);pointer-events:none;"></div>

        <div style="position:relative;">
          <!-- Logo -->
          <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:64px;">
            <div style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,var(--gold),var(--gold-dark));display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px var(--gold-glow);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#08111a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.5 21a7.5 7.5 0 0 1 0-18h3a7.5 7.5 0 0 1 0 18h-3z"/>
                <line x1="12" y1="3" x2="12" y2="21"/>
              </svg>
            </div>
            <span style="font-family:'DM Serif Display',serif;font-size:1.1rem;color:var(--text-primary);">Pharma Finance</span>
          </div>

          <h1 style="font-family:'DM Serif Display',serif;font-size:2.4rem;color:var(--text-primary);line-height:1.15;margin:0 0 16px;font-weight:400;">
            Your pharmacy's<br/>
            <span style="color:var(--gold);">financial ledger</span>,<br/>
            digitized.
          </h1>
          <p style="font-size:.875rem;color:var(--text-secondary);line-height:1.7;margin:0;max-width:320px;">
            Track invoices, payments, and income in both USD and LBP. No more lost papers, no more missed due dates.
          </p>
        </div>

        <!-- Feature list -->
        <div style="position:relative;">
          @for (f of features; track f.label) {
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
              <div style="width:28px;height:28px;border-radius:8px;background:var(--gold-bg);border:1px solid rgba(212,168,83,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;" [innerHTML]="f.icon"></div>
              <span style="font-size:.82rem;color:var(--text-secondary);">{{ f.label }}</span>
            </div>
          }
        </div>
      </div>

      <!-- Right panel — form -->
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 40px;position:relative;">

        <!-- Theme toggle -->
        <button (click)="theme.toggle()"
                style="position:absolute;top:28px;right:28px;width:36px;height:36px;border-radius:8px;background:var(--bg-elevated);border:1px solid var(--border);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-secondary);transition:all .15s;"
                title="Toggle theme">
          @if (theme.theme() === 'dark') {
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          } @else {
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          }
        </button>

        <div style="width:100%;max-width:380px;" class="fade-up">
          <div style="margin-bottom:32px;">
            <h2 style="font-family:'DM Serif Display',serif;font-size:1.8rem;color:var(--text-primary);margin:0 0 6px;font-weight:400;">Welcome back</h2>
            <p style="font-size:.82rem;color:var(--text-secondary);margin:0;">Sign in to your account to continue</p>
          </div>

          <!-- Google sign-in -->
          <button type="button" (click)="onGoogleSignIn()" [disabled]="loadingGoogle()"
                  style="width:100%;display:flex;align-items:center;justify-content:center;gap:10px;padding:11px 18px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg-elevated);color:var(--text-primary);font-family:'Outfit',sans-serif;font-size:.875rem;font-weight:500;cursor:pointer;transition:background .15s,border-color .15s,box-shadow .15s;margin-bottom:20px;"
                  onmouseover="this.style.background='var(--bg-hover)';this.style.borderColor='var(--text-dim)';"
                  onmouseout="this.style.background='var(--bg-elevated)';this.style.borderColor='var(--border)';">
            @if (loadingGoogle()) {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin .7s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              Redirecting...
            } @else {
              <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            }
          </button>

          <!-- Divider -->
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
            <hr style="flex:1;border:none;border-top:1px solid var(--border);margin:0;" />
            <span style="font-size:.72rem;color:var(--text-dim);white-space:nowrap;">or sign in with email</span>
            <hr style="flex:1;border:none;border-top:1px solid var(--border);margin:0;" />
          </div>

          <form (ngSubmit)="onSubmit()">
            <!-- Email -->
            <div style="margin-bottom:18px;">
              <label class="label" for="email">Email address</label>
              <input id="email" class="input" type="email" name="email"
                     [(ngModel)]="email" required autocomplete="email"
                     placeholder="you@example.com" />
            </div>

            <!-- Password -->
            <div style="margin-bottom:24px;">
              <label class="label" for="password">Password</label>
              <input id="password" class="input" type="password" name="password"
                     [(ngModel)]="password" required autocomplete="current-password"
                     placeholder="••••••••" />
            </div>

            <!-- Error -->
            @if (error()) {
              <div style="background:var(--red-bg);border:1px solid rgba(231,76,60,.25);border-radius:var(--radius-sm);padding:10px 14px;margin-bottom:18px;display:flex;align-items:center;gap:8px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <p style="font-size:.8rem;color:var(--red);margin:0;">{{ error() }}</p>
              </div>
            }

            <!-- Submit -->
            <button type="submit" class="btn-primary" [disabled]="loading()"
                    style="width:100%;justify-content:center;padding:11px 18px;font-size:.875rem;">
              @if (loading()) {
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:spin .7s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Signing in...
              } @else {
                Sign In
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
    <style>
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>
  `,
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
