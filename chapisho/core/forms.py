from django import forms
from .models import BusinessProfile


class BusinessProfileForm(forms.ModelForm):
    class Meta:
        model = BusinessProfile
        fields = [
            'business_name', 'phone', 'email', 'address', 'logo',
            'default_vat_percent', 'invoice_prefix', 'quote_prefix', 'sms_sender_id',
        ]
        labels = {
            'business_name': 'Jina la Biashara',
            'phone': 'Namba ya Simu',
            'email': 'Barua Pepe',
            'address': 'Anwani',
            'logo': 'Nembo (Logo)',
            'default_vat_percent': 'VAT (%)',
            'invoice_prefix': 'Kiambishi cha Ankara',
            'quote_prefix': 'Kiambishi cha Bei-Kadirio',
            'sms_sender_id': 'Kitambulisho cha Mtumaji SMS',
        }
