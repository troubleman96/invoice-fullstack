# Architecture Overview

## Project Layout

```
chapisho/
├── chapisho/                  # Django project config package
│   ├── settings.py            # All settings: apps, DB, static, templates, auth
│   ├── urls.py                # Root URL dispatcher
│   ├── wsgi.py                # WSGI entry for Gunicorn/uWSGI
│   └── asgi.py                # ASGI entry (future async)
│
├── core/                      # App: authentication, dashboard, business profile
├── customers/                 # App: customer CRUD
├── invoices/                  # App: invoices, quotes, PDF, public shares
├── sms/                       # App: SMS via Africa's Talking
├── analytics/                 # App: Chart.js dashboards + JSON endpoints
│
├── templates/                 # All Django templates (one subdir per app)
│   ├── core/                  # base.html, login.html, dashboard.html, settings.html
│   ├── customers/             # list, detail, form, confirm_delete
│   ├── invoices/              # list, detail, form, confirm_delete, pdf_template, public_share
│   ├── sms/                   # send_form
│   ├── analytics/             # dashboard
│   ├── 404.html
│   └── 500.html
│
├── static/                    # Static assets
│   ├── css/theme.css          # Complete B&W design system with dark mode
│   ├── js/invoice-form.js     # Invoice form interactivity
│   └── js/charts.js           # Analytics chart rendering
│
├── manage.py                  # Django CLI
├── requirements.txt           # Python dependencies
├── .env.example               # Environment variable template
└── chapisho_jenga_ankara_na_bei_kwa_urahisi.html  # Standalone client-side tool
```

## Data Flow

```
User (browser)
    │
    ├───► Login ──► Session stored
    │
    ├───► Dashboard ──► core.views.dashboard()
    │       │              │
    │       │              ├── BusinessProfile (KPI data)
    │       │              └── Invoice (recent invoices)
    │
    ├───► Customers ──► customers.views
    │       │              │
    │       │              ├── Customer list with search
    │       │              ├── Create/Edit via CustomerForm
    │       │              └── Detail with invoice history
    │
    ├───► Invoices ──► invoices.views
    │       │              │
    │       │              ├── Create/Edit via InvoiceForm + InvoiceItemFormSet
    │       │              ├── Live preview (JS reads form fields)
    │       │              ├── PDF download via WeasyPrint
    │       │              ├── Status update (draft → sent → paid)
    │       │              ├── WhatsApp share (wa.me link + UUID)
    │       │              └── Public share (no auth, UUID lookup)
    │
    ├───► SMS ──► sms.views
    │       │         │
    │       │         ├── AJAX send via Africa's Talking
    │       │         └── History log
    │
    └───► Analytics ──► analytics.views
                │
                ├── Revenue by month (TruncMonth aggregation)
                ├── Paid vs outstanding (two querysets)
                ├── Top 5 customers (ordered by grand_total)
                └── SMS stats (success rate, cost)
```

## Model Relationships

```
User (django.contrib.auth)
  │
  └── 1:1 ── BusinessProfile
                │
                ├── 1:N ── Customer
                │            │
                │            └── 1:N ── Invoice
                │                         │
                │                         ├── 1:N ── InvoiceItem
                │                         │
                │                         └── 1:1 ── SMSLog (optional)
                │
                └── 1:N ── SMSLog
```

All data is scoped to a `BusinessProfile`, providing multi-tenancy. Every view retrieves `request.user.business_profile` and filters queries accordingly.

## URL Routing

| Prefix | App | Root URL Conf |
|--------|-----|---------------|
| `/` | core | `chapisho/urls.py` includes `core.urls` |
| `/wateja/` | customers | `chapisho/urls.py` includes `customers.urls` |
| `/ankara/` | invoices | `chapisho/urls.py` includes `invoices.urls` |
| `/sms/` | sms | `chapisho/urls.py` includes `sms.urls` |
| `/takwimu/` | analytics | `chapisho/urls.py` includes `analytics.urls` |
| `/p/<uuid>/` | invoices (public) | Direct path in `chapisho/urls.py` |
| `/admin/` | django.contrib.admin | Direct path in `chapisho/urls.py` |

## Design System

The CSS uses CSS custom properties with a pure black-and-white palette:

- **Light mode**: White background, near-black text, subtle gray borders
- **Dark mode**: Near-black background, white text, dark gray borders
- Activated automatically via `@media (prefers-color-scheme: dark)`

All UI elements (buttons, inputs, cards, tables, badges) use the same `--radius` (8px), `--font-mono` for numbers, and consistent spacing.
