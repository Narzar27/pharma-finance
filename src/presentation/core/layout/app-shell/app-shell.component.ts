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
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
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
