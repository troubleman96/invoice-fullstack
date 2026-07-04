import re
from decimal import Decimal
from django.db import models, transaction
from django.db.models import Max


class Invoice(models.Model):
    DOCUMENT_TYPES = [
        ('invoice', 'Ankara'),
        ('quote', 'Bei-Kadirio'),
    ]
    STATUS_CHOICES = [
        ('draft', 'Rasimu'),
        ('sent', 'Imetumwa'),
        ('paid', 'Imelipwa'),
        ('overdue', 'Imechelewa'),
    ]
    DISCOUNT_CHOICES = [
        ('percent', '%'),
        ('fixed', 'Kiasi'),
    ]

    business = models.ForeignKey('core.BusinessProfile', on_delete=models.CASCADE, related_name='invoices')
    customer = models.ForeignKey('customers.Customer', on_delete=models.PROTECT, related_name='invoices')
    document_type = models.CharField(max_length=10, choices=DOCUMENT_TYPES)
    number = models.CharField(max_length=30, blank=True, unique=True)
    issue_date = models.DateField()
    due_date = models.DateField()
    vat_enabled = models.BooleanField(default=True)
    vat_percent = models.DecimalField(max_digits=5, decimal_places=2, default=18.00)
    discount_type = models.CharField(max_length=10, choices=DISCOUNT_CHOICES, blank=True)
    discount_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    vat_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    share_uuid = models.UUIDField(unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.number} - {self.customer.name}"

    def save(self, *args, **kwargs):
        if not self.number:
            self.number = self._generate_number()
        self._compute_totals()
        if not self.share_uuid:
            import uuid
            self.share_uuid = uuid.uuid4()
        super().save(*args, **kwargs)

    def _generate_number(self):
        prefix = self.business.invoice_prefix if self.document_type == 'invoice' else self.business.quote_prefix
        year = self.issue_date.year
        with transaction.atomic():
            last = Invoice.objects.filter(
                business=self.business,
                document_type=self.document_type,
                issue_date__year=year
            ).select_for_update().order_by('-id').first()
            if last:
                match = re.search(r'(\d+)$', last.number)
                next_seq = (int(match.group(1)) + 1) if match else 1
            else:
                next_seq = 1
            return f"{prefix}-{year}-{next_seq:04d}"

    def _compute_totals(self):
        subtotal = Decimal('0')
        for item in self.items.all():
            subtotal += item.line_total
        self.subtotal = subtotal

        if self.vat_enabled:
            self.vat_amount = subtotal * (self.vat_percent / Decimal('100'))
        else:
            self.vat_amount = Decimal('0')

        if self.discount_type == 'percent':
            self.discount_amount = subtotal * (self.discount_value / Decimal('100'))
        elif self.discount_type == 'fixed':
            self.discount_amount = self.discount_value
        else:
            self.discount_amount = Decimal('0')

        self.grand_total = subtotal + self.vat_amount - self.discount_amount


class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    description = models.CharField(max_length=500)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    line_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    def __str__(self):
        return self.description

    def save(self, *args, **kwargs):
        self.line_total = self.quantity * self.unit_price
        super().save(*args, **kwargs)
