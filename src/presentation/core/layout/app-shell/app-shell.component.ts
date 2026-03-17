import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="display:flex; min-height:100vh;">
      <app-sidebar (signOut)="onSignOut()" />
      <main style="flex:1; margin-left:220px; min-height:100vh; background:#0f1923; overflow-y:auto;">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AppShellComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  async onSignOut() {
    await this.auth.signOut();
    this.router.navigate(['/login']);
  }
}
