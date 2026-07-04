# SMS App — Africa's Talking Integration

**Location**: `chapisho/sms/`

Send invoices and messages to customers via SMS using the Africa's Talking API.

## Models

### SMSLog

**File**: `sms/models.py`

| Field | Type | Details |
|-------|------|---------|
| `business` | FK → BusinessProfile | Tenant scope |
| `invoice` | FK → Invoice (nullable) | Optional link to invoice |
| `customer` | FK → Customer (nullable) | Optional link to customer |
| `phone` | CharField (20) | Recipient phone number |
| `message` | TextField | SMS content |
| `status` | CharField (10) | `sent`, `failed`, `pending` |
| `provider_response` | JSONField (nullable) | Raw API response |
| `cost` | DecimalField (10,2) (nullable) | Cost in TZS |
| `sent_at` | DateTimeField (auto) | When sent |

## Services

### send_sms (`sms/services.py`)

```python
def send_sms(phone, message, business, invoice=None, customer=None):
```

Core SMS sending logic:

1. Initializes Africa's Talking SDK with credentials from settings
2. Calls `africastalking.SMS.send(phone, message, sender_id)`
3. Captures the API response (status code, cost per recipient)
4. Logs everything to `SMSLog` (success or failure)
5. Returns `SMSLog` object

If Africa's Talking credentials are not configured, the function still logs the attempt with status `failed`.

## Views

### sms_send (`sms/views.py`)

- **GET**: Shows the SMS form. Accepts `?phone=` and `?message=` query parameters to pre-fill (used from customer detail and invoice detail pages).
- **POST via AJAX**: Validates phone number format (must be `0...` or `+255...` or `255...`), calls `send_sms()`, returns JSON `{status, message}`.
- Checks `api_key_configured` to show a warning banner if Africa's Talking is not set up.

### Pre-filled Message

When coming from an invoice, the default message includes:
- Invoice number
- Customer name
- Grand total
- Due date
- Share URL

## Templates

| Template | Purpose |
|----------|---------|
| `templates/sms/send_form.html` | SMS compose form with phone, message, character counter, AJAX submit, history table |

## URL Routes

| Path | Name | View |
|------|------|------|
| `/tuma/` | `sms_send` | `sms_send` |

Mounted at `/sms/` in the root URL conf.
