import re
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from .services import send_sms
from .models import SMSLog
from invoices.models import Invoice
from customers.models import Customer


@login_required
def sms_send(request):
    business = request.user.business_profile
    invoice_id = request.GET.get('invoice')
    customer_id = request.GET.get('customer')
    phone = request.GET.get('phone', '')
    invoice = None
    customer = None

    if invoice_id:
        invoice = get_object_or_404(Invoice, pk=invoice_id, business=business)
        customer = invoice.customer
        phone = customer.phone
    elif customer_id:
        customer = get_object_or_404(Customer, pk=customer_id, business=business)
        phone = request.GET.get('phone', customer.phone)

    default_message = ''
    if invoice:
        default_message = (
            f"Habari {customer.name}, ankara namba {invoice.number} "
            f"yenye jumla ya TZS {int(invoice.grand_total)} imetengenezwa. "
            f"Malipo yanahitajika kabla ya {invoice.due_date.strftime('%d/%m/%Y')}. "
            f"Asante — {business.business_name}."
        )

    api_key_configured = bool(business.sms_sender_id)
    sms_history = SMSLog.objects.filter(business=business).order_by('-sent_at')[:20]

    context = {
        'invoice': invoice,
        'customer': customer,
        'phone': phone,
        'default_message': default_message,
        'api_key_configured': api_key_configured,
        'sms_history': sms_history,
    }

    if request.method == 'POST':
        phone = request.POST.get('phone', '')
        message = request.POST.get('message', '')

        if not re.match(r'^\+?[\d\s\-\(\)]{7,20}$', phone):
            return JsonResponse({'status': 'failed', 'message': 'Namba ya simu si sahihi.'})

        if not message:
            return JsonResponse({'status': 'failed', 'message': 'Ujumbe hauna maandishi.'})

        log = send_sms(business, phone, message, invoice=invoice, customer=customer)
        if log.status == 'sent':
            return JsonResponse({'status': 'sent', 'message': 'SMS imetumwa!'})
        else:
            return JsonResponse({'status': 'failed', 'message': 'Imeshindikana kutuma SMS, jaribu tena.'})

    return render(request, 'sms/send_form.html', context)
