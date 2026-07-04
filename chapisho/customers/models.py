import re
from django.db import models
from django.db.models import Sum, Q


class Customer(models.Model):
    business = models.ForeignKey('core.BusinessProfile', on_delete=models.CASCADE, related_name='customers')
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20)
    address = models.TextField(blank=True)
    email = models.EmailField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        self.phone = self._normalize_phone(self.phone)
        super().save(*args, **kwargs)

    def _normalize_phone(self, phone):
        phone = re.sub(r'\s+', '', phone)
        if phone.startswith('0'):
            phone = '+255' + phone[1:]
        elif phone.startswith('+'):
            pass
        elif phone.startswith('255'):
            phone = '+' + phone
        else:
            phone = '+255' + phone
        return phone

    def total_invoiced(self):
        from invoices.models import Invoice
        return Invoice.objects.filter(customer=self, business=self.business).aggregate(
            s=Sum('grand_total')
        )['s'] or 0

    def total_outstanding(self):
        from invoices.models import Invoice
        return Invoice.objects.filter(
            customer=self, business=self.business, status__in=['sent', 'overdue']
        ).aggregate(s=Sum('grand_total'))['s'] or 0

    def total_paid(self):
        from invoices.models import Invoice
        return Invoice.objects.filter(
            customer=self, business=self.business, status='paid'
        ).aggregate(s=Sum('grand_total'))['s'] or 0
