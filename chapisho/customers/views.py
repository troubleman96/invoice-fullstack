from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .models import Customer
from .forms import CustomerForm
from invoices.models import Invoice


@login_required
def customer_list(request):
    business = request.user.business_profile
    q = request.GET.get('q', '')
    customers = Customer.objects.filter(business=business)
    if q:
        customers = customers.filter(name__icontains=q)
    context = {
        'customers': customers,
        'q': q,
    }
    return render(request, 'customers/list.html', context)


@login_required
def customer_create(request):
    business = request.user.business_profile
    if request.method == 'POST':
        form = CustomerForm(request.POST)
        if form.is_valid():
            customer = form.save(commit=False)
            customer.business = business
            customer.save()
            messages.success(request, 'Mteja ameongezwa.')
            next_url = request.GET.get('next', 'customer_list')
            if next_url == 'invoice_create':
                return redirect('invoice_create')
            return redirect('customer_list')
    else:
        form = CustomerForm()
    return render(request, 'customers/form.html', {'form': form, 'title': 'Ongeza Mteja'})


@login_required
def customer_edit(request, pk):
    business = request.user.business_profile
    customer = get_object_or_404(Customer, pk=pk, business=business)
    if request.method == 'POST':
        form = CustomerForm(request.POST, instance=customer)
        if form.is_valid():
            form.save()
            messages.success(request, 'Mteja amesasishwa.')
            return redirect('customer_detail', pk=customer.pk)
    else:
        form = CustomerForm(instance=customer)
    return render(request, 'customers/form.html', {'form': form, 'title': 'Hariri Mteja', 'customer': customer})


@login_required
def customer_detail(request, pk):
    business = request.user.business_profile
    customer = get_object_or_404(Customer, pk=pk, business=business)
    invoices = Invoice.objects.filter(customer=customer, business=business).order_by('-created_at')
    context = {
        'customer': customer,
        'invoices': invoices,
    }
    return render(request, 'customers/detail.html', context)


@login_required
def customer_delete(request, pk):
    business = request.user.business_profile
    customer = get_object_or_404(Customer, pk=pk, business=business)
    if request.method == 'POST':
        customer.delete()
        messages.success(request, 'Mteja amefutwa.')
        return redirect('customer_list')
    return render(request, 'customers/confirm_delete.html', {'customer': customer})
