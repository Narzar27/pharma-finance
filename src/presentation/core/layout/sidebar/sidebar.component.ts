import { Component, ChangeDetectionStrategy, output, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../theme/theme.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav style="
      width:220px; height:100vh;
      background:var(--bg-surface);
      border-right:1px solid var(--border);
      display:flex; flex-direction:column;
      position:fixed; left:0; top:0; z-index:50;
      transition:background .25s, border-color .25s;
    ">
      <!-- Brand -->
      <div style="padding:22px 20px 18px; border-bottom:1px solid var(--border);">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,var(--gold),var(--gold-dark));display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px var(--gold-glow);">
            <!-- Pill icon -->
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#08111a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.5 21a7.5 7.5 0 0 1 0-18h3a7.5 7.5 0 0 1 0 18h-3z"/>
              <line x1="12" y1="3" x2="12" y2="21"/>
            </svg>
          </div>
          <div>
            <p style="font-family:'DM Serif Display',serif;font-size:.95rem;color:var(--text-primary);margin:0;line-height:1.2;">Pharma Finance</p>
            <p style="font-size:.68rem;color:var(--text-dim);margin:0;letter-spacing:.06em;text-transform:uppercase;">Ledger System</p>
          </div>
        </div>
      </div>

      <!-- Nav -->
      <div style="padding:12px 10px;flex:1;overflow-y:auto;">
        <p style="font-size:.62rem;font-weight:600;color:var(--text-dim);letter-spacing:.1em;text-transform:uppercase;padding:0 10px;margin:0 0 6px;">Menu</p>
        @for (item of navItems; track item.path) {
          <a [routerLink]="item.path"
             routerLinkActive="active-link"
             [routerLinkActiveOptions]="{exact: item.exact ?? false}"
             class="nav-link"
             style="
               display:flex;align-items:center;gap:10px;
               padding:9px 12px;border-radius:var(--radius-sm);margin-bottom:2px;
               text-decoration:none;color:var(--text-secondary);
               font-size:.82rem;font-weight:500;
               transition:background .15s, color .15s;
             ">
            <span style="width:18px;height:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0;" [innerHTML]="item.icon"></span>
            {{ item.label }}
          </a>
        }
      </div>

      <!-- Bottom controls -->
      <div style="padding:12px 10px;border-top:1px solid var(--border);">
        <!-- Theme toggle -->
        <button (click)="theme.toggle()"
                style="display:flex;align-items:center;gap:10px;width:100%;padding:9px 12px;border-radius:var(--radius-sm);background:none;border:none;cursor:pointer;color:var(--text-secondary);font-size:.82rem;font-weight:500;font-family:'Outfit',sans-serif;transition:background .15s,color .15s;margin-bottom:2px;"
                (mouseenter)="$any($event.currentTarget).style.background='var(--bg-hover)'"
                (mouseleave)="$any($event.currentTarget).style.background='none'">
          @if (theme.theme() === 'dark') {
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            Light Mode
          } @else {
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            Dark Mode
          }
        </button>

        <!-- Sign out -->
        <button (click)="signOut.emit()"
                style="display:flex;align-items:center;gap:10px;width:100%;padding:9px 12px;border-radius:var(--radius-sm);background:none;border:none;cursor:pointer;color:var(--text-dim);font-size:.82rem;font-weight:500;font-family:'Outfit',sans-serif;transition:background .15s,color .15s;"
                (mouseenter)="$any($event.currentTarget).style.cssText+='background:var(--red-bg)!important;color:var(--red)!important;'"
                (mouseleave)="$any($event.currentTarget).style.cssText='display:flex;align-items:center;gap:10px;width:100%;padding:9px 12px;border-radius:var(--radius-sm);background:none;border:none;cursor:pointer;color:var(--text-dim);font-size:.82rem;font-weight:500;font-family:Outfit,sans-serif;transition:background .15s,color .15s;'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign Out
        </button>
      </div>
    </nav>

    <style>
      .active-link {
        background: var(--gold-bg) !important;
        color: var(--gold) !important;
        box-shadow: inset 3px 0 0 var(--gold);
      }
      .active-link svg { stroke: var(--gold) !important; }
      .nav-link:hover {
        background: var(--bg-hover);
        color: var(--text-primary);
      }
    </style>
  `,
})
export class SidebarComponent {
  signOut = output<void>();
  theme = inject(ThemeService);

  navItems = [
    { path: '/dashboard', label: 'Dashboard', exact: true, icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>` },
    { path: '/suppliers', label: 'Suppliers', icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>` },
    { path: '/invoices', label: 'Invoices', icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>` },
    { path: '/income', label: 'Income', icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>` },
    { path: '/reports', label: 'Reports', icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>` },
  ];
}
