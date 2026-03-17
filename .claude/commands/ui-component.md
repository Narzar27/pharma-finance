# UI Component

You are building or modifying an Angular component or page in the pharma-finance app.

## Component checklist

- [ ] `standalone: true`
- [ ] `ChangeDetectionStrategy.OnPush`
- [ ] Inputs use `input()` signal API
- [ ] Outputs use `output()` signal API
- [ ] DI via `inject()` — no constructor injection
- [ ] No direct Supabase calls — only use cases
- [ ] Form fields have `<label>` elements

## Design system

All styles use CSS custom properties defined in `src/styles.css`. Never add hardcoded colors or use Tailwind utility classes for colors — use the variables.

### CSS variables
```
--bg-base        page background
--bg-surface     cards, sidebar
--bg-elevated    inputs, table headers
--bg-hover       hover states
--border         dividers, input borders
--text-primary   headings
--text-secondary body text
--text-dim       labels, placeholders
--gold           primary accent (brand color)
--gold-dark      darker gold
--gold-bg        gold tint background
--gold-glow      gold glow for shadows
--green          positive/paid amounts
--red            negative/overdue
--red-bg         error backgrounds
--amber          warnings, partial status
```

### Utility classes (defined in styles.css)
```
.btn-primary     gold filled button
.btn-ghost       outline/text button
.input           text input / select / textarea
.label           form field label
.card            surface card with border + shadow
.stat-card       metric card (label + value + subtext)
.table-wrap      table container with border radius
.modal           centered modal panel
.modal-overlay   full-screen backdrop
.font-mono       monospace (amounts, dates, IDs)
.fade-up         entrance animation
.fade-up-1..5    staggered animation delays
.section-title   table/section heading
.divider         <hr> styled divider
.row-danger      red-tinted table row (overdue)
```

### Currency badge
```html
<app-currency-badge [currency]="'USD'" />
<app-currency-badge [currency]="'LBP'" />
```

### Status badge
```html
<app-status-badge [status]="'unpaid'" />   <!-- red -->
<app-status-badge [status]="'partial'" />  <!-- amber -->
<app-status-badge [status]="'paid'" />     <!-- green -->
```

## Layout patterns

**Top bar with action button:**
```html
<app-top-bar title="Page Title">
  <button class="btn-primary" (click)="...">Add Item</button>
</app-top-bar>
<div style="padding:28px;">
  <!-- page content -->
</div>
```

**Modal:**
```html
<div class="modal-overlay" (click)="closeIfBackdrop($event)">
  <div class="modal fade-up" (click)="$event.stopPropagation()">
    <!-- content -->
  </div>
</div>
```

**Stat cards grid:**
```html
<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px;margin-bottom:28px;">
  <div class="stat-card fade-up fade-up-1">
    <p class="stat-label">Label</p>
    <p class="stat-value" style="color:var(--green);">Value</p>
    <p style="font-size:.72rem;color:var(--text-dim);margin:6px 0 0;">subtext</p>
  </div>
</div>
```

## Typography
- Page/modal titles: `font-family:'DM Serif Display',serif; font-weight:400`
- Body: `font-family:'Outfit',sans-serif`
- Amounts/dates/IDs: `.font-mono` class
