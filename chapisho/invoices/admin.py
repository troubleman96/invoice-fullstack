from django.contrib import admin
from .models import Invoice, InvoiceItem


class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 0


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['number', 'customer', 'document_type', 'grand_total', 'status', 'issue_date']
    inlines = [InvoiceItemInline]


admin.site.register(InvoiceItem)
