import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen flex items-center justify-center relative overflow-hidden"
         style="background: #08111a;">

      <!-- Background geometric pattern -->
      <div class="absolute inset-0 pointer-events-none" aria-hidden="true">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#243a50" stroke-width="0.5" opacity="0.4"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <!-- Ambient glow -->
      <div class="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
           style="background: radial-gradient(circle, rgba(212,168,83,0.06) 0%, transparent 70%);"></div>

      <!-- Login card -->
      <div class="relative z-10 w-full max-w-sm mx-4 fade-up">
        <!-- Logo / Brand -->
        <div class="text-center mb-10">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4"
               style="background: linear-gradient(135deg, #d4a853 0%, #b8923f 100%); box-shadow: 0 0 32px rgba(212,168,83,0.25);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>
            </svg>
          </div>
          <h1 style="font-family:'DM Serif Display',serif; font-size:1.75rem; color:#e8edf2; line-height:1.2;">
            Pharma Finance
          </h1>
          <p style="font-family:'Outfit',sans-serif; font-size:0.8rem; color:#7a8f9e; margin-top:4px; letter-spacing:0.08em; text-transform:uppercase;">
            Pharmacy Ledger System
          </p>
        </div>

        <!-- Form card -->
        <div style="background:#16222e; border:1px solid #243a50; border-radius:12px; padding:32px;">
          <form (ngSubmit)="onSubmit()" #f="ngForm">
            <!-- Email -->
            <div class="mb-5">
              <label for="email"
                     style="display:block; font-size:0.75rem; font-weight:500; color:#7a8f9e; letter-spacing:0.06em; text-transform:uppercase; margin-bottom:8px;">
                Email
              </label>
              <input id="email"
                     type="email"
                     name="email"
                     [(ngModel)]="email"
                     required
                     autocomplete="email"
                     style="width:100%; background:#1c2f40; border:1px solid #243a50; border-radius:8px; padding:10px 14px; font-size:0.875rem; color:#e8edf2; outline:none; transition:border-color 0.2s;"
                     (focus)="onFocus($event)"
                     (blur)="onBlur($event)"
                     placeholder="you@example.com" />
            </div>

            <!-- Password -->
            <div class="mb-7">
              <label for="password"
                     style="display:block; font-size:0.75rem; font-weight:500; color:#7a8f9e; letter-spacing:0.06em; text-transform:uppercase; margin-bottom:8px;">
                Password
              </label>
              <input id="password"
                     type="password"
                     name="password"
                     [(ngModel)]="password"
                     required
                     autocomplete="current-password"
                     style="width:100%; background:#1c2f40; border:1px solid #243a50; border-radius:8px; padding:10px 14px; font-size:0.875rem; color:#e8edf2; outline:none; transition:border-color 0.2s;"
                     (focus)="onFocus($event)"
                     (blur)="onBlur($event)"
                     placeholder="••••••••" />
            </div>

            <!-- Error message -->
            @if (error()) {
              <div style="background:rgba(231,76,60,0.1); border:1px solid rgba(231,76,60,0.3); border-radius:8px; padding:10px 14px; margin-bottom:16px;">
                <p style="font-size:0.8rem; color:#e74c3c; margin:0;">{{ error() }}</p>
              </div>
            }

            <!-- Submit -->
            <button type="submit"
                    [disabled]="loading()"
                    style="width:100%; padding:11px; border-radius:8px; font-size:0.875rem; font-weight:600; letter-spacing:0.02em; cursor:pointer; transition:all 0.2s; border:none;"
                    [style.background]="loading() ? '#b8923f' : 'linear-gradient(135deg, #d4a853 0%, #b8923f 100%)'"
                    [style.color]="'#08111a'"
                    [style.boxShadow]="loading() ? 'none' : '0 4px 16px rgba(212,168,83,0.25)'">
              {{ loading() ? 'Signing in...' : 'Sign In' }}
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  loading = signal(false);
  error = signal('');

  async onSubmit() {
    this.loading.set(true);
    this.error.set('');
    const { error } = await this.auth.signIn(this.email, this.password);
    this.loading.set(false);
    if (error) {
      this.error.set(error.message);
    } else {
      this.router.navigate(['/']);
    }
  }

  onFocus(e: FocusEvent) {
    (e.target as HTMLElement).style.borderColor = '#d4a853';
  }

  onBlur(e: FocusEvent) {
    (e.target as HTMLElement).style.borderColor = '#243a50';
  }
}
