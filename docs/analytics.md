# Analytics App — Dashboards and Charts

**Location**: `chapisho/analytics/`

Provides a dashboard with Chart.js visualizations and JSON data endpoints.

## Views

### dashboard (`analytics/views.py:7`)

Renders the analytics page template with Chart.js canvases. No context data needed — all data is fetched client-side via JSON endpoints.

### revenue_by_month (`analytics/views.py:12`)

**URL**: `/takwimu/data/mapato/`  
**Response**: JSON array of `{month, total}` objects

Aggregates invoice `grand_total` by month using Django's `TruncMonth` database function. Filters to invoices with status `paid` or `sent` for the current business. Respects the `?months=` query parameter (defaults to 12).

```json
[
  {"month": "2026-01-01T00:00:00+03:00", "total": 1500000.00},
  {"month": "2026-02-01T00:00:00+03:00", "total": 2300000.00}
]
```

### paid_vs_outstanding (`analytics/views.py:28`)

**URL**: `/takwimu/data/hali/`  
**Response**: JSON `{paid, outstanding}`

Two queries:
- **paid**: Sum of `grand_total` where `status='paid'`
- **outstanding**: Sum of `grand_total` where `status__in=['sent', 'overdue']`

### top_customers (`analytics/views.py:42`)

**URL**: `/takwimu/data/wateja-bora/`  
**Response**: JSON array of `{name, total}`

Top 5 customers by total invoice `grand_total`, ordered descending. Uses Django values+annotate to aggregate per customer.

### sms_stats (`analytics/views.py:56`)

**URL**: `/takwimu/data/sms/`  
**Response**: JSON `{total, sent, failed, success_rate, cost}`

Aggregates from `SMSLog`:
- `total`: Count of all logs
- `sent`: Count where `status='sent'`
- `failed`: Count where `status='failed'`
- `success_rate`: `sent / total * 100` (0 if no logs)
- `cost`: Sum of `cost` field

## Client-Side Charts

**File**: `static/js/charts.js`

Fetches all four JSON endpoints on page load and renders:

| Chart | Type | Data Source |
|-------|------|-------------|
| Revenue by Month | Bar (vertical) | `/takwimu/data/mapato/` |
| Paid vs Outstanding | Doughnut | `/takwimu/data/hali/` |
| Top 5 Customers | Bar (horizontal) | `/takwimu/data/wateja-bora/` |
| SMS Stats | Stat cards (HTML) | `/takwimu/data/sms/` |

The charts auto-detect dark mode by checking `matchMedia('(prefers-color-scheme: dark)')` and adjust grid/text colors accordingly.

A date range filter (`?months=3|6|12`) reloads the revenue chart with different time spans.

## Templates

| Template | Purpose |
|----------|---------|
| `templates/analytics/dashboard.html` | Chart canvases + SMS stat cards, loads Chart.js from CDN |

## URL Routes

| Path | Name | View |
|------|------|------|
| `/` | `analytics_dashboard` | `dashboard` |
| `/data/mapato/` | `analytics_revenue` | `revenue_by_month` |
| `/data/hali/` | `analytics_status` | `paid_vs_outstanding` |
| `/data/wateja-bora/` | `analytics_top_customers` | `top_customers` |
| `/data/sms/` | `analytics_sms` | `sms_stats` |

Mounted at `/takwimu/` in the root URL conf.
