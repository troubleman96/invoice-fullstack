from datetime import timedelta
from decimal import Decimal
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncMonth
from django.utils import timezone
from invoices.models import Invoice
from sms.models import SMSLog
from customers.models import Customer


@login_required
def dashboard(request):
    return render(request, 'analytics/dashboard.html')


@login_required
def revenue_by_month(request):
    business = request.user.business_profile
    months = int(request.GET.get('months', 12))
    cutoff = timezone.now() - timedelta(days=30 * months)

    data = (
        Invoice.objects.filter(business=business, issue_date__gte=cutoff)
        .annotate(month=TruncMonth('issue_date'))
        .values('month')
        .annotate(total=Sum('grand_total'))
        .order_by('month')
    )

    result = {
        'labels': [d['month'].strftime('%b %Y') if d['month'] else '' for d in data],
        'values': [float(d['total']) for d in data],
    }
    return JsonResponse(result)


@login_required
def paid_vs_outstanding(request):
    business = request.user.business_profile
    paid = Invoice.objects.filter(business=business, status='paid').aggregate(
        s=Sum('grand_total')
    )['s'] or 0
    outstanding = Invoice.objects.filter(
        business=business, status__in=['sent', 'overdue']
    ).aggregate(s=Sum('grand_total'))['s'] or 0

    return JsonResponse({
        'labels': ['Imelipwa', 'Zinazosubiri'],
        'values': [float(paid), float(outstanding)],
    })


@login_required
def top_customers(request):
    business = request.user.business_profile
    top = (
        Invoice.objects.filter(business=business)
        .values('customer__name')
        .annotate(total=Sum('grand_total'))
        .order_by('-total')[:5]
    )

    return JsonResponse({
        'labels': [c['customer__name'] for c in top],
        'values': [float(c['total']) for c in top],
    })


@login_required
def sms_stats(request):
    business = request.user.business_profile
    total = SMSLog.objects.filter(business=business).count()
    sent = SMSLog.objects.filter(business=business, status='sent').count()
    failed = SMSLog.objects.filter(business=business, status='failed').count()
    total_cost = SMSLog.objects.filter(business=business, status='sent').aggregate(
        s=Sum('cost')
    )['s'] or 0

    success_rate = (sent / total * 100) if total > 0 else 0

    return JsonResponse({
        'total': total,
        'sent': sent,
        'failed': failed,
        'success_rate': round(success_rate, 1),
        'total_cost': float(total_cost),
    })
