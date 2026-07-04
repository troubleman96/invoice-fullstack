from django import forms
from django.forms import inlineformset_factory
from .models import Invoice, InvoiceItem


class InvoiceForm(forms.ModelForm):
    class Meta:
        model = Invoice
        fields = [
            'customer', 'document_type', 'issue_date', 'due_date',
            'vat_enabled', 'vat_percent', 'discount_type', 'discount_value',
            'notes', 'status',
        ]
        labels = {
            'customer': 'Mteja',
            'document_type': 'Aina ya Hati',
            'issue_date': 'Tarehe ya Kutolewa',
            'due_date': 'Tarehe ya Kukamilisha',
            'vat_enabled': 'Washa VAT',
            'vat_percent': 'VAT (%)',
            'discount_type': 'Aina ya Punguzo',
            'discount_value': 'Thamani ya Punguzo',
            'notes': 'Maelezo',
            'status': 'Hali',
        }
        widgets = {
            'issue_date': forms.DateInput(attrs={'type': 'date'}),
            'due_date': forms.DateInput(attrs={'type': 'date'}),
        }

    def __init__(self, *args, **kwargs):
        business = kwargs.pop('business', None)
        super().__init__(*args, **kwargs)
        if business:
            self.fields['customer'].queryset = business.customers.all()
            if not self.instance.pk:
                self.fields['vat_percent'].initial = business.default_vat_percent


class InvoiceItemForm(forms.ModelForm):
    class Meta:
        model = InvoiceItem
        fields = ['description', 'quantity', 'unit_price']
        labels = {
            'description': 'Maelezo',
            'quantity': 'Idadi',
            'unit_price': 'Bei ya Kipande',
        }


InvoiceItemFormSet = inlineformset_factory(
    Invoice, InvoiceItem, form=InvoiceItemForm,
    extra=3, can_delete=True, min_num=1, validate_min=True,
)
