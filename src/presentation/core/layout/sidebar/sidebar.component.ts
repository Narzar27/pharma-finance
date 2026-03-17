import { Component, ChangeDetectionStrategy, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav style="
      width: 220px;
      height: 100vh;
      background: #0f1923;
      border-right: 1px solid #1c2f40;
      display: flex;
      flex-direction: column;
      position: fixed;
      left: 0; top: 0;
      z-index: 50;
    ">
      <!-- Brand -->
      <div style="padding: 24px 20px 20px; border-bottom: 1px solid #1c2f40;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="width:32px; height:32px; border-radius:8px; background:linear-gradient(135deg,#d4a853,#b8923f); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#08111a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>
            </svg>
          </div>
          <div>
            <div style="font-family:'DM Serif Display',serif; font-size:0.95rem; color:#e8edf2; line-height:1.1;">Pharma</div>
            <div style="font-family:'DM Serif Display',serif; font-size:0.95rem; color:#d4a853; line-height:1.1;">Finance</div>
          </div>
        </div>
      </div>

      <!-- Nav items -->
      <div style="padding: 12px 10px; flex:1;">
        @for (item of navItems; track item.path) {
          <a [routerLink]="item.path"
             routerLinkActive="active-nav"
             style="
               display:flex; align-items:center; gap:10px;
               padding:9px 12px; border-radius:8px; margin-bottom:2px;
               text-decoration:none; color:#7a8f9e;
               font-family:'Outfit',sans-serif; font-size:0.8rem; font-weight:500;
               letter-spacing:0.02em; transition:all 0.15s;
             "
             [style.color]="'#7a8f9e'">
            <span style="width:16px; height:16px; display:flex; align-items:center; justify-content:center; flex-shrink:0;"
                  [innerHTML]="item.icon"></span>
            {{ item.label }}
          </a>
        }
      </div>

      <!-- Sign out -->
      <div style="padding:12px 10px; border-top:1px solid #1c2f40;">
        <button (click)="signOut.emit()"
                style="
                  display:flex; align-items:center; gap:10px;
                  width:100%; padding:9px 12px; border-radius:8px;
                  background:none; border:none; cursor:pointer; color:#4a6070;
                  font-family:'Outfit',sans-serif; font-size:0.8rem; font-weight:500;
                  letter-spacing:0.02em; transition:color 0.15s;
                "
                (mouseenter)="$any($event.target).style.color='#e74c3c'"
                (mouseleave)="$any($event.target).style.color='#4a6070'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign Out
        </button>
      </div>
    </nav>

    <style>
      .active-nav {
        background: #1c2f40 !important;
        color: #d4a853 !important;
      }
      .active-nav svg { stroke: #d4a853; }
    </style>
  `,
})
export class SidebarComponent {
  signOut = output<void>();

  navItems: NavItem[] = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    },
    {
      path: '/suppliers',
      label: 'Suppliers',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    },
    {
      path: '/invoices',
      label: 'Invoices',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
    },
    {
      path: '/income',
      label: 'Income',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    },
    {
      path: '/reports',
      label: 'Reports',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
    },
  ];
}
