# PROMPT: Build "Chapisho" as a Full Django App (Invoices + Analytics + SMS Generator)

Use this document as the complete build spec/prompt for an AI coding tool (Claude Code, Cursor, etc.) or a human developer. It evolves the original UI-only "Chapisho" spec into a real, persisted, multi-page Django application — same Swahili-only, black & white, system-theme UI — now backed by a database, with an analytics dashboard and an SMS generator feature.

**Assumption stated up front (read this first):** The original version was no-login/UI-only. A real Django app that persists invoices, customers, and SMS logs needs *some* way to know whose data is whose. This spec adds a **minimal single-business login** (one owner account per deployment, plain Django auth — no public sign-up flow, no multi-tenant complexity). If you actually want zero accounts at all, tell me and I'll redesign around session-only/anonymous storage instead — but that makes analytics and SMS history meaningless across devices, so login is the sensible default here.

**SMS provider assumption:** Spec uses **Africa's Talking** (strong Tanzania/East Africa SMS coverage, pay-as-you-go, simple REST API). If you prefer Twilio, Beem Africa, or another local aggregator, swap the adapter described in §8 — the rest of the app is provider-agnostic by design.

---

## 1. Product Summary

**Chapisho** becomes a full Django web app for Tanzanian freelancers/contractors to:
- Create and manage invoices ("Ankara") and quotes ("Bei-Kadirio") for repeat customers.
- Export any invoice as a polished PDF.
- Share via WhatsApp (client-side link, same as before).
- **Send an SMS directly to the customer's phone** with the invoice summary and amount due.
- View an **analytics dashboard**: revenue over time, outstanding vs paid, top customers, SMS delivery stats.

Same design language throughout: **Swahili-only UI, black/white theme following system `prefers-color-scheme`, fully responsive**.

---

## 2. Tech Stack

- **Backend:** Django 5.x, Python 3.12+
- **Database:** SQLite for local/dev, PostgreSQL for production (use `DATABASE_URL` env var pattern, e.g. via `dj-database-url`)
- **Templates:** Django Templates (`{% extends %}`, `{% include %}`, `{% block %}`) — port the original single-file HTML/CSS/JS into a proper template hierarchy (see §6)
- **CSS/JS:** Keep vanilla CSS (no framework needed) — reuse the exact color tokens and responsive rules from the original spec, moved into `static/css/theme.css`. Keep JS for live calculation in `static/js/invoice-form.js`, now progressively enhancing Django form submission (form still works with JS disabled — totals recalculated server-side on save as source of truth).
- **PDF generation:** `WeasyPrint` (renders an HTML template straight to PDF server-side — most reliable for crisp text and matches the on-screen design exactly since it uses the same CSS).
- **SMS:** `africastalking` Python SDK (or raw `requests` call to their REST API if the SDK is unavailable).
- **Charts (analytics):** Chart.js loaded from CDN, rendered client-side from a JSON endpoint the Django view provides — kept black/white/grayscale only, no colored chart series (use different line/bar patterns, e.g. dashed vs solid, or grayscale shades, to distinguish series).
- **Auth:** Django's built-in `django.contrib.auth`, single business-owner account, no self-registration page (create via `createsuperuser` or a one-time setup command).
- **Static/media:** `django.contrib.staticfiles`, `MEDIA_ROOT` for uploaded logos.
- **Env config:** `.env` file via `django-environ` or `python-decouple` for secrets (`SECRET_KEY`, `AFRICASTALKING_USERNAME`, `AFRICASTALKING_API_KEY`, `DATABASE_URL`, `DEBUG`).

---

## 3. Django Project Structure

```
chapisho/
├── manage.py
├── requirements.txt
├── .env.example
├── chapisho/                  # project settings
│   ├── settings.py
│   ├── urls.py
│   ├── wsgi.py / asgi.py
├── core/                      # business profile, auth, shared base template
│   ├── models.py              # BusinessProfile
│   ├── views.py                # login, settings, dashboard home
│   ├── urls.py
│   ├── templates/core/
│   │   ├── base.html          # master layout: <head>, theme CSS, nav, footer
│   │   ├── login.html
│   │   ├── dashboard.html      # landing page after login: quick stats + "Tengeneza Ankara" CTA
│   │   └── settings.html       # business info, logo, default VAT, SMS sender ID
├── customers/
│   ├── models.py               # Customer
│   ├── views.py                 # list, create, edit, detail (with invoice history)
│   ├── forms.py
│   ├── urls.py
│   └── templates/customers/
│       ├── list.html
│       ├── form.html
│       └── detail.html
├── invoices/
│   ├── models.py               # Invoice, InvoiceItem
│   ├── views.py                 # list, create/edit (with formset for items), detail, pdf export
│   ├── forms.py                 # InvoiceForm + InvoiceItemFormSet
│   ├── pdf.py                   # WeasyPrint rendering helper
│   ├── urls.py
│   └── templates/invoices/
│       ├── list.html
│       ├── form.html            # the big create/edit page (§6.4)
│       ├── detail.html          # preview + action buttons (Pakua/WhatsApp/SMS)
│       └── pdf_template.html    # print-only layout used by WeasyPrint
├── sms/
│   ├── models.py                # SMSLog
│   ├── services.py              # Africa's Talking adapter (send_sms function)
│   ├── views.py                  # send-SMS endpoint (AJAX + full-page fallback)
│   ├── urls.py
│   └── templates/sms/
│       └── send_form.html        # modal/section: phone + message preview + send
├── analytics/
│   ├── views.py                  # dashboard view + JSON endpoints for charts
│   ├── urls.py
│   └── templates/analytics/
│       └── dashboard.html
├── static/
│   ├── css/theme.css              # ported black/white system-theme design system
│   └── js/
│       ├── invoice-form.js         # line item add/remove, live totals
│       └── charts.js                # Chart.js init, grayscale config
└── templates/
    └── 404.html / 500.html         # branded error pages, same theme
```

---

## 4. Data Models

### `core.BusinessProfile` (one row, belongs to the owner `User`)
- `owner` — OneToOneField(User)
- `business_name` — CharField
- `phone` — CharField
- `email` — EmailField, blank
- `address` — TextField, blank
- `logo` — ImageField, blank/null
- `default_vat_percent` — DecimalField, default `18.00`
- `invoice_prefix` — CharField, default `"INV"`
- `quote_prefix` — CharField, default `"QUO"`
- `sms_sender_id` — CharField, blank (Africa's Talking alphanumeric sender ID if approved)

### `customers.Customer`
- `business` — ForeignKey(BusinessProfile)
- `name` — CharField, required
- `phone` — CharField, required (validate Tanzanian format, e.g. `+255...` or `0...`, normalize to `+255` on save)
- `address` — TextField, blank
- `email` — EmailField, blank
- `created_at` — DateTimeField(auto_now_add)
- Property/method: `total_invoiced()`, `total_outstanding()` for use in analytics and customer detail page.

### `invoices.Invoice`
- `business` — ForeignKey(BusinessProfile)
- `customer` — ForeignKey(Customer)
- `document_type` — CharField choices: `("invoice", "Ankara"), ("quote", "Bei-Kadirio")`
- `number` — CharField, unique per business (auto-generated `INV-2026-0001` pattern, see §5)
- `issue_date` — DateField, default today
- `due_date` — DateField
- `vat_enabled` — BooleanField, default True
- `vat_percent` — DecimalField, default from BusinessProfile
- `discount_type` — CharField choices: `("percent", "%"), ("fixed", "Kiasi")`, blank
- `discount_value` — DecimalField, default 0
- `notes` — TextField, blank
- `status` — CharField choices: `("draft", "Rasimu"), ("sent", "Imetumwa"), ("paid", "Imelipwa"), ("overdue", "Imechelewa")`, default `draft`
- `subtotal`, `vat_amount`, `discount_amount`, `grand_total` — DecimalField, computed and stored on save (denormalized for fast analytics queries)
- `created_at`, `updated_at` — DateTimeField

### `invoices.InvoiceItem`
- `invoice` — ForeignKey(Invoice, related_name="items")
- `description` — CharField
- `quantity` — DecimalField, default 1
- `unit_price` — DecimalField
- `line_total` — DecimalField, computed on save (`quantity * unit_price`)

### `sms.SMSLog`
- `business` — ForeignKey(BusinessProfile)
- `invoice` — ForeignKey(Invoice, null=True, blank=True, related_name="sms_logs")
- `customer` — ForeignKey(Customer, null=True, blank=True)
- `phone` — CharField (snapshot, in case customer is edited/deleted later)
- `message` — TextField
- `status` — CharField choices: `("sent", "Imetumwa"), ("failed", "Imeshindikana"), ("pending", "Inasubiri")`
- `provider_response` — JSONField, null=True (store raw API response for debugging)
- `cost` — DecimalField, null=True (if provider returns cost, useful for analytics)
- `sent_at` — DateTimeField(auto_now_add)

---

## 5. Invoice Numbering Logic

Server-side, on `Invoice.save()` (or in the form's `save()`), if `number` is blank:
```python
prefix = business.invoice_prefix if document_type == "invoice" else business.quote_prefix
year = issue_date.year
last = Invoice.objects.filter(business=business, document_type=document_type, issue_date__year=year).order_by('-id').first()
next_seq = (extract_seq(last.number) + 1) if last else 1
number = f"{prefix}-{year}-{next_seq:04d}"
```
Wrap in a transaction with `select_for_update()` to avoid duplicate numbers under concurrent requests (even single-owner apps can double-submit from two tabs).

---

## 6. Pages / Templates (same visual system, now real routes)

All pages extend `core/base.html`, which contains: `<head>` with theme CSS, top nav (Chapisho logo, links: Dashibodi / Ankara / Wateja / Takwimu / Mipangilio / Toka), and footer disclaimer line about data (now honestly updated — see §10 privacy note).

### 6.1 `/login/` — Ingia
- Simple username + password form, Swahili labels ("Jina la Mtumiaji", "Nywila", button "Ingia"). Same black/white styling as original inputs/buttons.

### 6.2 `/` (Dashboard) — Dashibodi
- Quick KPIs at top (cards): Jumla ya Ankara Mwezi Huu, Mapato ya Mwezi Huu, Ankara Zinazosubiri Malipo, SMS Zilizotumwa.
- Big primary button: "+ Tengeneza Ankara Mpya".
- Recent invoices table (last 10): number, customer, date, total, status badge (styled with weight/border, not color, per original theme rule).

### 6.3 `/wateja/` — Customers (Wateja)
- `list.html`: searchable/sortable table of customers, name/phone/total invoiced/outstanding, "+ Ongeza Mteja" button.
- `form.html`: create/edit customer (reuses the exact fields from original Screen D).
- `detail.html`: customer profile + full invoice history + a persistent "Tuma SMS" quick-action (see §8).

### 6.4 `/ankara/mpya/` and `/ankara/<id>/hariri/` — Invoice create/edit (the core page, ports original Screens B–I)
- Document type selector (Ankara / Bei-Kadirio) — same segmented control.
- Customer picker: searchable dropdown of existing customers **plus** an inline "+ Mteja Mpya" quick-add (modal or expandable inline form) so the flow from the original spec (type customer name once) still feels just as fast.
- Invoice meta fields (auto number shown read-only once generated, dates default as before).
- Dynamic line-items formset (Django formset, JS-enhanced for add/remove rows without full page reload — same UX as original Screen F, now backed by `InvoiceItemFormSet`).
- Totals summary block — same VAT/discount/grand total logic as §6 of the original spec, calculated live in JS **and** recalculated authoritatively server-side on save (never trust client-side numbers for stored data).
- Notes field, same default Swahili placeholder text.
- Live preview pane — same as original Screen I, now rendered via a Django template partial (`invoices/_preview_partial.html`) shared between the live-preview AJAX endpoint and the PDF template, so the preview and the exported PDF are guaranteed to look identical.

### 6.5 `/ankara/<id>/` — Invoice detail/view page
- Read-only rendered invoice (same visual layout as preview).
- Action bar (same as original Screen J): **Pakua PDF**, **Tuma kwa WhatsApp**, and the new **Tuma SMS** button.
- Status control: dropdown to mark Rasimu / Imetumwa / Imelipwa / Imechelewa.

### 6.6 `/ankara/<id>/pdf/` — PDF export endpoint
- Renders `invoices/pdf_template.html` (print-optimized variant of the preview) through WeasyPrint, returns `application/pdf` with `Content-Disposition: attachment; filename="Ankara-{number}-{customer_slug}.pdf"`.

### 6.7 `/takwimu/` — Analytics dashboard (Takwimu)
KPI cards + charts (all grayscale, Chart.js):
- **Mapato kwa Mwezi** (Revenue by month) — bar chart, last 12 months.
- **Ankara: Zimelipwa dhidi ya Zinazosubiri** (Paid vs Outstanding) — simple grayscale donut/bar (avoid pie-chart color reliance; use hatch patterns or labeled segments).
- **Wateja Bora 5** (Top 5 customers by total invoiced) — horizontal bar list.
- **Takwimu za SMS**: jumla zilizotumwa, kiwango cha mafanikio (success rate %), gharama ya jumla (if cost data available from provider).
- Date range filter (this month / last 3 months / this year / custom range).
- Backing views return JSON from a `/takwimu/data/<metric>/` endpoint consumed by `static/js/charts.js`; server does the aggregation with Django ORM (`aggregate`, `annotate`, `TruncMonth`).

### 6.8 `/mipangilio/` — Settings (Mipangilio)
- Edit BusinessProfile fields: name, phone, email, address, logo upload, default VAT %, invoice/quote number prefixes, SMS sender ID.
- A read-only "SMS Provider" status indicator (connected/not configured) based on whether `AFRICASTALKING_API_KEY` is set.

---

## 7. Visual Design System — carry over unchanged

Port exactly from the original spec into `static/css/theme.css`:
- Same light/dark color tokens (§4.1 of original: `#FFFFFF`/`#0A0A0A` etc.), driven by `prefers-color-scheme`.
- Same typography scale, spacing, rounded corners, sticky mobile action bar.
- Status badges (draft/sent/paid/overdue) must use weight/border/icon distinctions only — **no color** — consistent with the "no colors other than black/white/gray" rule from the original acceptance checklist. E.g.:
  - Rasimu → dashed border badge
  - Imetumwa → solid outline badge
  - Imelipwa → filled black/white badge (inverted) with a "✓" glyph
  - Imechelewa → bold text + "⚠" glyph

Responsive breakpoints identical to the original spec's §8 table — re-verify at 360px, 768px, 1440px for every new page (customer list, analytics dashboard, and the invoice formset are the highest-risk pages for overflow on mobile; line items must remain stacked cards on phones, and charts must resize/scroll horizontally rather than break layout).

---

## 8. SMS Generator Feature (new)

**User flow:** From an invoice detail page or a customer's page, the owner clicks **"Tuma SMS"**. A form/modal appears:
- Phone number — pre-filled from `customer.phone`, editable.
- Message — pre-filled editable template:
  > "Habari {CustomerName}, ankara namba {Number} yenye jumla ya TZS {GrandTotal} imetengenezwa. Malipo yanahitajika kabla ya {DueDate}. Asante — {BusinessName}."
- Character counter (SMS billed per 160-char segment for GSM-7 encoding; show "Sehemu 1 ya 160" style counter so the owner knows if they're about to pay for 2 segments).
- "Tuma Sasa" (Send Now) button.

**Backend (`sms/services.py`):**
```python
import africastalking

def send_sms(business, phone, message, invoice=None, customer=None):
    africastalking.initialize(settings.AFRICASTALKING_USERNAME, settings.AFRICASTALKING_API_KEY)
    sms = africastalking.SMS
    try:
        response = sms.send(message, [phone], sender_id=business.sms_sender_id or None)
        status = "sent" if response_indicates_success(response) else "failed"
    except Exception as e:
        response = {"error": str(e)}
        status = "failed"
    return SMSLog.objects.create(
        business=business, invoice=invoice, customer=customer,
        phone=phone, message=message, status=status, provider_response=response
    )
```
- Endpoint `POST /sms/tuma/` — accepts phone, message, optional `invoice_id`/`customer_id`, calls `send_sms`, returns JSON `{status, message}` for AJAX (so the UI can show a Swahili success/failure toast: "SMS imetumwa!" / "Imeshindikana kutuma SMS, jaribu tena.") — again no color-coded toast, use icon + weight.
- Every send, success or failure, is logged to `SMSLog` — this is what feeds the Analytics SMS stats in §6.7.
- Rate-limit/guard: disable the send button for 3 seconds after click (prevent double-send from double-click) and validate phone format server-side before calling the provider (save an API call on obviously malformed numbers).
- Graceful missing-config state: if `AFRICASTALKING_API_KEY` is not set in `.env`, the "Tuma SMS" button shows disabled with tooltip "SMS haijawekwa — nenda Mipangilio" instead of erroring at click time.

---

## 9. WhatsApp Share (carried over, now server-aware)

- Same `wa.me/{phone}?text={message}` client-side link as the original spec.
- Improvement now possible server-side: since invoices persist, generate a **public, unguessable share link** (e.g. `/p/<uuid>/` — a read-only, unauthenticated view of just that one invoice, no login required to view) so the WhatsApp message can include an actual clickable link to view/download the invoice online, instead of relying purely on manual PDF attachment. Message template becomes:
  > "Habari {CustomerName}, tazama ankara yako namba {Number} hapa: {public_link}"
- Keep the original "download-first" button too for owners who prefer sending the PDF file directly instead of a link.
- The public share view (`/p/<uuid>/`) reuses the same preview template but strips all navigation/owner controls — read-only, print/download button only.

---

## 10. Privacy & Data Notes (update from original)

Since this version *does* persist data server-side (unlike the original localStorage-only version), the footer disclaimer text must be updated to stay honest:
> "Taarifa za ankara zinahifadhiwa kwa usalama kwenye akaunti yako. Hazitolewi kwa mtu yeyote wa tatu isipokuwa kutuma SMS kwa mteja uliyemtaja."

Do not carry over the old "hazihifadhiwi popote" (never stored) claim — that would now be false and must be corrected.

---

## 11. Requirements File (starting point)

```
Django>=5.0,<6.0
weasyprint
africastalking
python-decouple
dj-database-url
psycopg2-binary
Pillow
gunicorn
whitenoise
```

---

## 12. Acceptance Checklist

- [ ] Owner can log in; no public self-registration route exists.
- [ ] Creating an invoice with a new customer works in one flow (inline quick-add customer).
- [ ] Line-item formset add/remove works with and without JS (progressive enhancement — server-side re-render still functions if JS fails).
- [ ] Invoice totals stored server-side match what's displayed in the live preview and the exported PDF exactly.
- [ ] PDF export downloads a correctly named, correctly formatted file matching the on-screen preview pixel-for-pixel in layout.
- [ ] WhatsApp button opens a correctly pre-filled chat; public share link (`/p/<uuid>/`) loads without login and shows only that one invoice.
- [ ] SMS send button: succeeds with a real Africa's Talking sandbox/live key, fails gracefully and logs the failure when the key is missing/invalid, and always creates an `SMSLog` row either way.
- [ ] Analytics dashboard renders correct revenue-by-month, paid-vs-outstanding, top-5-customers, and SMS stats against seeded test data.
- [ ] All charts and badges use only black/white/gray — no color anywhere in the UI, including chart series and status badges.
- [ ] Dark/light mode follows system setting with no manual toggle, consistent across every new page (dashboard, analytics, customers, settings — not just the invoice form).
- [ ] Fully responsive at 360px/768px/1440px on every page, including the analytics charts and the customer/invoice tables (stacked-card fallback on mobile, not horizontal scroll-only tables).
- [ ] Settings page correctly persists business profile changes and reflects them immediately in new invoices' defaults (VAT %, prefixes, logo).
- [ ] Deleting/editing a customer does not corrupt historical `SMSLog` or `Invoice` records (snapshot phone/customer name where needed, use `on_delete=PROTECT` or `SET_NULL` deliberately per model — decide explicitly in migrations, don't leave it as default `CASCADE` where it would silently destroy invoice history).
