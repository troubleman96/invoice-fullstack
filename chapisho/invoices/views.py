import json
from decimal import Decimal
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import HttpResponse, JsonResponse
from django.db import transaction
from .models import Invoice, InvoiceItem
from .forms import InvoiceForm, InvoiceItemFormSet
from .pdf import render_pdf
from customers.forms import CustomerForm


@login_required
def invoice_list(request):
    business = request.user.business_profile
    status_filter = request.GET.get('status', '')
    invoices = Invoice.objects.filter(business=business).select_related('customer')
    if status_filter:
        invoices = invoices.filter(status=status_filter)
    context = {
        'invoices': invoices,
        'status_filter': status_filter,
    }
    return render(request, 'invoices/list.html', context)


@login_required
def invoice_create(request):
    business = request.user.business_profile
    customer_form = CustomerForm(prefix='customer')

    if request.method == 'POST':
        form = InvoiceForm(request.POST, business=business)
        if form.is_valid():
            invoice = form.save(commit=False)
            invoice.business = business
            items_valid = True

            with transaction.atomic():
                invoice.save()
                formset = InvoiceItemFormSet(request.POST, instance=invoice)
                if formset.is_valid():
                    formset.save()
                else:
                    items_valid = False

            if items_valid:
                messages.success(request, 'Ankara imetengenezwa.')
                return redirect('invoice_detail', pk=invoice.pk)
        else:
            formset = InvoiceItemFormSet(request.POST)
    else:
        form = InvoiceForm(business=business)
        formset = InvoiceItemFormSet()

    context = {
        'form': form,
        'formset': formset,
        'customer_form': customer_form,
        'business': business,
        'title': 'Tengeneza Ankara Mpya',
    }
    return render(request, 'invoices/form.html', context)


@login_required
def invoice_edit(request, pk):
    business = request.user.business_profile
    invoice = get_object_or_404(Invoice, pk=pk, business=business)

    if request.method == 'POST':
        form = InvoiceForm(request.POST, instance=invoice, business=business)
        formset = InvoiceItemFormSet(request.POST, instance=invoice)
        if form.is_valid() and formset.is_valid():
            with transaction.atomic():
                form.save()
                formset.save()
            messages.success(request, 'Ankara imesasishwa.')
            return redirect('invoice_detail', pk=invoice.pk)
    else:
        form = InvoiceForm(instance=invoice, business=business)
        formset = InvoiceItemFormSet(instance=invoice)

    context = {
        'form': form,
        'formset': formset,
        'business': business,
        'title': 'Hariri Ankara',
        'invoice': invoice,
    }
    return render(request, 'invoices/form.html', context)


@login_required
def invoice_detail(request, pk):
    business = request.user.business_profile
    invoice = get_object_or_404(Invoice, pk=pk, business=business)
    context = {'invoice': invoice}
    return render(request, 'invoices/detail.html', context)


@login_required
def invoice_pdf(request, pk):
    business = request.user.business_profile
    invoice = get_object_or_404(Invoice, pk=pk, business=business)
    pdf = render_pdf(invoice)
    filename = f"{invoice.get_document_type_display()}-{invoice.number}-{invoice.customer.name}.pdf"
    response = HttpResponse(pdf, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


@login_required
def invoice_status(request, pk):
    business = request.user.business_profile
    invoice = get_object_or_404(Invoice, pk=pk, business=business)
    if request.method == 'POST':
        new_status = request.POST.get('status')
        if new_status in dict(Invoice.STATUS_CHOICES):
            invoice.status = new_status
            invoice.save()
            messages.success(request, 'Hali ya ankara imebadilishwa.')
    return redirect('invoice_detail', pk=invoice.pk)


@login_required
def invoice_delete(request, pk):
    business = request.user.business_profile
    invoice = get_object_or_404(Invoice, pk=pk, business=business)
    if request.method == 'POST':
        invoice.delete()
        messages.success(request, 'Ankara imefutwa.')
        return redirect('invoice_list')
    return render(request, 'invoices/confirm_delete.html', {'invoice': invoice})


@login_required
def quick_customer(request):
    business = request.user.business_profile
    if request.method == 'POST':
        form = CustomerForm(request.POST)
        if form.is_valid():
            customer = form.save(commit=False)
            customer.business = business
            customer.save()
            return JsonResponse({'id': customer.id, 'name': customer.name, 'phone': customer.phone})
        return JsonResponse({'errors': form.errors}, status=400)
    return JsonResponse({}, status=405)


def public_share(request, uuid):
    invoice = get_object_or_404(Invoice, share_uuid=uuid)
    return render(request, 'invoices/public_share.html', {'invoice': invoice})
