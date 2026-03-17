import { Injectable, signal } from '@angular/core';
import { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../infrastructure/supabase/supabase.client';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private db = getSupabaseClient();

  readonly session = signal<Session | null>(null);
  readonly user = signal<User | null>(null);

  constructor() {
    // Restore session on init
    this.db.auth.getSession().then(({ data }) => {
      this.session.set(data.session);
      this.user.set(data.session?.user ?? null);
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

  signOut() {
    return this.db.auth.signOut();
  }

  isAuthenticated(): boolean {
    return this.session() !== null;
  }
}
