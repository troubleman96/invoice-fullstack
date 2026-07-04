# Customers App — Customer Management

**Location**: `chapisho/customers/`

Full CRUD for business customers with phone number normalization and computed invoice totals.

## Models

### Customer

**File**: `customers/models.py`

```python
class Customer(models.Model):
    business = ForeignKey(BusinessProfile, on_delete=CASCADE, related_name='customers')
    name = CharField(max_length=200)
    phone = CharField(max_length=20, unique=True)
    email = EmailField(blank=True)
    address = TextField(blank=True)
    created_at = DateTimeField(auto_now_add=True)
```

**Phone normalization**: On save, the phone number is cleaned to Tanzanian format `+255...`:
- If it starts with `0`, the `0` is replaced with `+255`
- If it starts with `255`, a `+` is prepended
- Spaces, dashes, and parentheses are stripped

### Calculated Properties

The `Customer` model includes three computed properties that aggregate from related invoices:

- `total_invoiced`: Sum of `grand_total` for all invoices
- `total_outstanding`: Sum of `grand_total` for invoices with status `sent` or `overdue`
- `total_paid`: Sum of `grand_total` for invoices with status `paid`

## Views

All views are protected by `@login_required` and scope data to `request.user.business_profile`.

### customer_list (`customers/views.py:10`)

- Displays all customers for the business
- Supports search via `?q=` query parameter (searches `name` with `icontains`)

### customer_create (`customers/views.py:28`)

- Creates a new customer
- Accepts `?next=invoice_create` to redirect to invoice creation after save (used from the invoice form's quick-add flow)

### customer_detail (`customers/views.py:55`)

- Shows customer contact info and computed financial totals
- Lists all invoices for this customer with status badges

### customer_edit / customer_delete

Standard edit and delete (with confirmation) views.

## Templates

| Template | Purpose |
|----------|---------|
| `templates/customers/list.html` | Customer table with search, empty state |
| `templates/customers/detail.html` | Contact info, financial summary, invoice list, SMS action |
| `templates/customers/form.html` | Create/edit form |
| `templates/customers/confirm_delete.html` | Delete confirmation with warning |

## URL Routes

| Path | Name | View |
|------|------|------|
| `/` | `customer_list` | `customer_list` |
| `/mpya/` | `customer_create` | `customer_create` |
| `/<pk>/` | `customer_detail` | `customer_detail` |
| `/<pk>/hariri/` | `customer_edit` | `customer_edit` |
| `/<pk>/futa/` | `customer_delete` | `customer_delete` |

Mounted at `/wateja/` in the root URL conf.
