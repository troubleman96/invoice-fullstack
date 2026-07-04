from django import forms
from .models import Customer


class CustomerForm(forms.ModelForm):
    class Meta:
        model = Customer
        fields = ['name', 'phone', 'email', 'address']
        labels = {
            'name': 'Jina la Mteja',
            'phone': 'Namba ya Simu',
            'email': 'Barua Pepe',
            'address': 'Anwani',
        }
