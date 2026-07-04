# Core App — Authentication, Dashboard, Settings

**Location**: `chapisho/core/`

The core app handles user authentication, the main dashboard, and business profile settings.

## Models

### BusinessProfile

**File**: `core/models.py`

```python
class BusinessProfile(models.Model):
    owner = OneToOneField(User, on_delete=CASCADE, related_name='business_profile')
    business_name = CharField(max_length=200)
    phone = CharField(max_length=20)
    email = EmailField(blank=True)
    address = TextField(blank=True)
    logo = ImageField(upload_to='logos/', blank=True, null=True)
    default_vat_percent = DecimalField(max_digits=5, decimal_places=2, default=18.00)
    invoice_prefix = CharField(max_length=10, default='INV')
    quote_prefix = CharField(max_length=10, default='QUO')
    sms_sender_id = CharField(max_length=11, blank=True, default='')
```

A one-to-one extension of Django's `User` model. Every authenticated user must have exactly one `BusinessProfile`. The `settings` page creates or updates this profile.

## Views

### login_view (`core/views.py:18`)

- Custom login, not Django's generic `LoginView`
- Accepts **username or email** in the username field
- If authentication with the raw input fails and the input contains `@`, it looks up the user by email and retries
- On success: redirects to `dashboard`
- On failure: shows Swahili error message ("Jina la mtumiaji au nywila si sahihi.")
- Already-authenticated users are redirect to dashboard

```python
def login_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        if user is None and '@' in username:
            try:
                user_obj = User.objects.get(email=username)
                user = authenticate(request, username=user_obj.username, password=password)
            except User.DoesNotExist:
                pass
        if user is not None:
            login(request, user)
            return redirect('dashboard')
        messages.error(request, 'Jina la mtumiaji au nywila si sahihi.')
    return render(request, 'core/login.html')
```

### logout_view (`core/views.py:35`)

Simple logout + redirect to login page.

### dashboard (`core/views.py:41`)

Protected by `@login_required`. Computes monthly KPIs:

- **total_invoices_month**: Count of invoices issued this month
- **revenue_month**: Sum of `grand_total` for invoices with status `paid` or `sent`
- **outstanding**: Sum of `grand_total` for invoices with status `sent` or `overdue`
- **sms_sent**: Count of SMS logs with status `sent`
- **recent_invoices**: Last 10 invoices

If the user has no `BusinessProfile`, redirects to the settings page.

### settings_view (`core/views.py:66`)

Protected by `@login_required`. Displays and saves `BusinessProfileForm`. Shows SMS configuration status.

## Templates

| Template | Purpose |
|----------|---------|
| `templates/core/base.html` | Base layout: HTML boilerplate, header nav, messages, footer, responsive hamburger menu |
| `templates/core/login.html` | Login form with username/email field, password field, Swahili copy |
| `templates/core/dashboard.html` | KPI grid + recent invoices table with status badges |
| `templates/core/settings.html` | Business profile form, SMS status indicator |

## URL Routes

| Path | Name | View |
|------|------|------|
| `/login/` | `login` | `login_view` |
| `/logout/` | `logout` | `logout_view` |
| `/` | `dashboard` | `dashboard` |
| `/mipangilio/` | `settings` | `settings_view` |
