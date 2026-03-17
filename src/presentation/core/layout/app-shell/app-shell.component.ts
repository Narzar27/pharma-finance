import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { AuthService } from '../../auth/auth.service';
import { MenuService } from '../menu/menu.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="display:flex; min-height:100vh;">
      <div class="mobile-overlay" [class.is-open]="menu.isOpen()" (click)="menu.close()"></div>
      <app-sidebar (signOut)="onSignOut()" />
      <main style="flex:1; margin-left:220px; min-height:100vh; background:var(--bg-base); overflow-y:auto; transition:background .25s;">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AppShellComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  menu = inject(MenuService);

  async onSignOut() {
    await this.auth.signOut();
    this.router.navigate(['/login']);
  }
}
