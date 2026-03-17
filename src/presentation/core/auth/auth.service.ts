import { Injectable, signal } from '@angular/core';
import { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../infrastructure/supabase/supabase.client';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private db = getSupabaseClient();

  readonly session = signal<Session | null>(null);
  readonly user = signal<User | null>(null);

  private _sessionReadyResolve!: () => void;
  readonly sessionReady = new Promise<void>(resolve => {
    this._sessionReadyResolve = resolve;
  });

  constructor() {
    // Restore session on init (also handles OAuth redirect tokens in the URL)
    this.db.auth.getSession().then(({ data }) => {
      this.session.set(data.session);
      this.user.set(data.session?.user ?? null);
      this._sessionReadyResolve();
    });

    // Listen for auth state changes
    this.db.auth.onAuthStateChange((_, session) => {
      this.session.set(session);
      this.user.set(session?.user ?? null);
    });
  }

  signIn(email: string, password: string) {
    return this.db.auth.signInWithPassword({ email, password });
  }

  signInWithGoogle() {
    return this.db.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  }

  signOut() {
    return this.db.auth.signOut();
  }

  isAuthenticated(): boolean {
    return this.session() !== null;
  }
}
