from django.db import models
from django.contrib.auth.models import User


class BusinessProfile(models.Model):
    owner = models.OneToOneField(User, on_delete=models.CASCADE, related_name='business_profile')
    business_name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    logo = models.ImageField(upload_to='logos/', blank=True, null=True)
    default_vat_percent = models.DecimalField(max_digits=5, decimal_places=2, default=18.00)
    invoice_prefix = models.CharField(max_length=10, default='INV')
    quote_prefix = models.CharField(max_length=10, default='QUO')
    sms_sender_id = models.CharField(max_length=11, blank=True, default='')

    def __str__(self):
        return self.business_name
