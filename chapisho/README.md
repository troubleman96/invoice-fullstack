# Chapisho — Invoicing for Tanzanian Micro-Entrepreneurs

**Chapisho** (Swahili for *"Publishing"*) is a Django web application that lets small business owners create, manage, and share invoices (*Ankara*) and quotes (*Bei-Kadirio*) in Swahili, with Tanzanian tax defaults.

## Quick Start

```bash
cd chapisho
cp .env.example .env        # edit SECRET_KEY and DATABASE_URL
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

## Architecture Overview

```
chapisho/                         # Django project root
├── chapisho/                     # Project config (settings, urls, wsgi/asgi)
├── core/                         # Auth, dashboard, business settings
├── customers/                    # Customer CRUD
├── invoices/                     # Invoices, quotes, PDF, public sharing
├── sms/                          # SMS via Africa's Talking API
├── analytics/                    # Charts and statistics JSON endpoints
├── templates/                    # Django templates per app
└── static/                       # CSS theme + JS (invoice form, charts)
```

Each Django app is self-contained with its own `models.py`, `views.py`, `urls.py`, and templates. The project uses Django's default `User` model with a one-to-one `BusinessProfile` extension for business details.

## Core Features

| Feature | Description |
|---------|-------------|
| **Auth** | Login with username or email, session-based |
| **Dashboard** | Monthly KPIs (invoices, revenue, outstanding, SMS) |
| **Customers** | Full CRUD with phone auto-normalization to `+255` |
| **Invoices/Quotes** | Two-column form with live preview, dynamic line items, auto-numbering |
| **PDF** | Download invoices as PDF via WeasyPrint |
| **WhatsApp** | One-click WhatsApp share with invoice link |
| **SMS** | Send invoices via Africa's Talking SMS API |
| **Public Share** | UUID-based read-only invoice view (no login) |
| **Analytics** | Revenue trends, paid vs outstanding, top customers, SMS stats |
| **Dark Mode** | CSS variables auto-detect system preference |
| **Client Tool** | Standalone `chapisho_jenga_ankara_na_bei_kwa_urahisi.html` — no server needed |

## App Walkthroughs

Detailed documentation for each component lives in [`docs/`](docs/):

| Document | Covers |
|----------|--------|
| [`docs/architecture.md`](docs/architecture.md) | Project layout, data flow, model relationships |
| [`docs/core.md`](docs/core.md) | Login, logout, dashboard, business settings |
| [`docs/customers.md`](docs/customers.md) | Customer CRUD, phone normalization, computed totals |
| [`docs/invoices.md`](docs/invoices.md) | Invoice/quote creation, line items, live preview, PDF, sharing |
| [`docs/sms.md`](docs/sms.md) | Africa's Talking integration, SMS history |
| [`docs/analytics.md`](docs/analytics.md) | Chart.js dashboards, JSON data endpoints |
| [`docs/deployment.md`](docs/deployment.md) | Environment setup, production config, static files |

## Tech Stack

- **Django 6.0** — Python web framework
- **SQLite** (dev) / **PostgreSQL** (prod) via `dj-database-url`
- **WeasyPrint** — HTML/CSS to PDF
- **Africa's Talking** — SMS API
- **Chart.js** — Client-side charts
- **Whitenoise** — Static file serving
- **Gunicorn** — Production WSGI
