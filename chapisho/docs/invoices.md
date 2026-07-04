# Invoices App — Invoices, Quotes, PDF, Sharing

**Location**: `chapisho/invoices/`

The most complex app. Handles creation, editing, listing, PDF download, status management, and sharing of invoices and quotes.

## Models

### Invoice

**File**: `invoices/models.py`

| Field | Type | Details |
|-------|------|---------|
| `business` | FK → BusinessProfile | Tenant scope |
| `customer` | FK → Customer (PROTECT) | Cannot delete customer with invoices |
| `document_type` | CharField (10) | `invoice` or `quote` |
| `number` | CharField (30) | Auto-generated, unique |
| `issue_date` | DateField | When issued |
| `due_date` | DateField | Payment deadline |
| `vat_enabled` | BooleanField | Toggle VAT calculation |
| `vat_percent` | DecimalField (5,2) | Default 18.00 |
| `discount_type` | CharField (10) | `percent` or `fixed` |
| `discount_value` | DecimalField (12,2) | Amount or percentage |
| `notes` | TextField | Additional terms |
| `status` | CharField (10) | `draft`, `sent`, `paid`, `overdue` |
| `subtotal` | DecimalField (14,2) | Sum of line items (auto-computed) |
| `vat_amount` | DecimalField (14,2) | subtotal × vat_percent/100 |
| `discount_amount` | DecimalField (14,2) | Based on type/value |
| `grand_total` | DecimalField (14,2) | subtotal + vat - discount |
| `share_uuid` | UUIDField | Public share identifier |
| `created_at` | DateTimeField | Auto |
| `updated_at` | DateTimeField | Auto |

### Number Auto-Generation (`Invoice._generate_number`)

Format: `{PREFIX}-{YEAR}-{SEQ:04d}`

- Prefix comes from `BusinessProfile.invoice_prefix` (default `INV`) or `quote_prefix` (default `QUO`)
- Sequence resets each year per business per document type
- Uses `select_for_update` to prevent race conditions

Examples: `INV-2026-0001`, `QUO-2026-0001`

### Totals Computation (`Invoice._compute_totals`)

Called automatically on every `save()`:

1. `subtotal` = sum of all `InvoiceItem.line_total`
2. `vat_amount` = `subtotal × vat_percent / 100` (if `vat_enabled`)
3. `discount_amount` = `subtotal × discount_value / 100` (if `percent`) or `discount_value` (if `fixed`)
4. `grand_total` = `subtotal + vat_amount - discount_amount`

### InvoiceItem

| Field | Type | Details |
|-------|------|---------|
| `invoice` | FK → Invoice (CASCADE) | Parent invoice |
| `description` | CharField (500) | Item description |
| `quantity` | DecimalField (10,2) | Default 1 |
| `unit_price` | DecimalField (12,2) | Price per unit |
| `line_total` | DecimalField (14,2) | Auto-computed: quantity × unit_price |

## Views

### invoice_create (`invoices/views.py:29`)

- **GET**: Renders the two-column form with live preview. Business profile data is pre-filled in the seller info section.
- **POST**: Validates `InvoiceForm` and `InvoiceItemFormSet` within a `transaction.atomic()` block.
- Creates a UUID via `uuid.uuid4()` for the share link.

### invoice_edit (`invoices/views.py:67`)

Loads existing invoice and its items into the same form layout. Uses `instance=invoice` to pre-populate.

### invoice_detail (`invoices/views.py:94`)

Shows full invoice: customer info, items table, totals, notes, status control form, WhatsApp and SMS action buttons.

### invoice_pdf (`invoices/views.py:101`)

Calls `invoices.pdf.render_pdf(invoice)` which uses WeasyPrint to convert `pdf_template.html` to PDF bytes. Returns the PDF as a downloadable attachment with a descriptive filename.

### invoice_status (`invoices/views.py:113`)

POST-only endpoint to update invoice status. Validates against `Invoice.STATUS_CHOICES`.

### quick_customer (`invoices/views.py:137`)

AJAX endpoint (`/ankara/mteja-haraka/`). Creates a customer without page reload. Used from the invoice form's "Mteja Mpya" button. Returns JSON `{id, name, phone}` or `{errors}`.

### public_share (`invoices/views.py:150`)

No authentication required. Looks up invoice by `share_uuid`. Renders a read-only view with a print button.

## Templates

| Template | Purpose |
|----------|---------|
| `templates/invoices/list.html` | Invoice list with status filter dropdown |
| `templates/invoices/form.html` | **Two-column create/edit form**: doc type selector, seller info (read-only), customer picker + quick-add, dates, dynamic line items, VAT/discount, notes, live preview pane, mobile sticky bar |
| `templates/invoices/detail.html` | Full invoice view with status control and share actions |
| `templates/invoices/confirm_delete.html` | Delete confirmation |
| `templates/invoices/pdf_template.html` | Print-optimized HTML for WeasyPrint PDF generation |
| `templates/invoices/public_share.html` | Public view (no auth) with print button |

## URL Routes

| Path | Name | View |
|------|------|------|
| `/` | `invoice_list` | `invoice_list` |
| `/mpya/` | `invoice_create` | `invoice_create` |
| `/<pk>/` | `invoice_detail` | `invoice_detail` |
| `/<pk>/hariri/` | `invoice_edit` | `invoice_edit` |
| `/<pk>/pdf/` | `invoice_pdf` | `invoice_pdf` |
| `/<pk>/hali/` | `invoice_status` | `invoice_status` |
| `/<pk>/futa/` | `invoice_delete` | `invoice_delete` |
| `/mteja-haraka/` | `quick_customer` | `quick_customer` |

Mounted at `/ankara/` in the root URL conf. Public share at `/p/<uuid>/`.

## Live Preview

The invoice form (`form.html`) includes a live preview pane that updates in real-time as the user fills fields. JavaScript reads form values and populates:

- Document title (ANKARA / BEI-KADIRIO)
- Seller info from BusinessProfile (read-only)
- Customer name and phone from the select dropdown
- Issue/due dates
- Line items table
- Totals (subtotal, VAT, discount, grand total)

## WhatsApp Sharing

The detail view generates a `wa.me` link:

```
https://wa.me/{phone}?text=Habari+{customer}+angalia+ankara+yako+namba+{number}+hapa:+{share_url}
```

The share URL points to `/p/{share_uuid}/` which renders the public view.

## PDF Generation

**File**: `invoices/pdf.py`

Uses WeasyPrint's `HTML(string=...).write_pdf()` to convert `pdf_template.html` (rendered with Django template engine) to PDF bytes. The template includes `@page` CSS with A4 size and 20mm margins.
