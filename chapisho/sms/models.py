from django.db import models


class SMSLog(models.Model):
    STATUS_CHOICES = [
        ('sent', 'Imetumwa'),
        ('failed', 'Imeshindikana'),
        ('pending', 'Inasubiri'),
    ]

    business = models.ForeignKey('core.BusinessProfile', on_delete=models.CASCADE, related_name='sms_logs')
    invoice = models.ForeignKey('invoices.Invoice', on_delete=models.SET_NULL, null=True, blank=True, related_name='sms_logs')
    customer = models.ForeignKey('customers.Customer', on_delete=models.SET_NULL, null=True, blank=True)
    phone = models.CharField(max_length=20)
    message = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    provider_response = models.JSONField(null=True, blank=True)
    cost = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-sent_at']

    def __str__(self):
        return f"SMS to {self.phone} - {self.status}"
