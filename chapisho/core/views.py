from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.contrib import messages
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta
from .models import BusinessProfile
from .forms import BusinessProfileForm
from invoices.models import Invoice
from sms.models import SMSLog


def login_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        if user is None and '@' in username:
            try:
                user_obj = User.objects.get(email=username)
                user = authenticate(request, username=user_obj.username, password=password)
            except User.DoesNotExist:
                pass
        if user is not None:
            login(request, user)
            return redirect('dashboard')
        messages.error(request, 'Jina la mtumiaji au nywila si sahihi.')
    return render(request, 'core/login.html')


def logout_view(request):
    logout(request)
    return redirect('login')


@login_required
def dashboard(request):
    try:
        business = request.user.business_profile
    except BusinessProfile.DoesNotExist:
        return redirect('settings')
    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    invoices_this_month = Invoice.objects.filter(
        business=business, issue_date__gte=month_start
    )
    total_invoices_month = invoices_this_month.count()
    revenue_month = invoices_this_month.filter(
        Q(status='paid') | Q(status='sent')
    ).aggregate(s=Sum('grand_total'))['s'] or 0

    outstanding = Invoice.objects.filter(
        business=business, status__in=['sent', 'overdue']
    ).aggregate(s=Sum('grand_total'))['s'] or 0

    sms_sent = SMSLog.objects.filter(
        business=business, sent_at__gte=month_start, status='sent'
    ).count()

    recent_invoices = Invoice.objects.filter(business=business).order_by('-created_at')[:10]

    context = {
        'total_invoices_month': total_invoices_month,
        'revenue_month': revenue_month,
        'outstanding': outstanding,
        'sms_sent': sms_sent,
        'recent_invoices': recent_invoices,
    }
    return render(request, 'core/dashboard.html', context)


@login_required
def settings_view(request):
    business = request.user.business_profile
    if request.method == 'POST':
        form = BusinessProfileForm(request.POST, request.FILES, instance=business)
        if form.is_valid():
            form.save()
            messages.success(request, 'Mipangilio imehifadhiwa.')
            return redirect('settings')
    else:
        form = BusinessProfileForm(instance=business)

    sms_configured = bool(business.sms_sender_id)
    context = {
        'form': form,
        'sms_configured': sms_configured,
    }
    return render(request, 'core/settings.html', context)
