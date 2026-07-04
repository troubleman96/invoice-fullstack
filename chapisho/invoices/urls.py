from django.urls import path
from . import views

urlpatterns = [
    path('', views.invoice_list, name='invoice_list'),
    path('mpya/', views.invoice_create, name='invoice_create'),
    path('<int:pk>/', views.invoice_detail, name='invoice_detail'),
    path('<int:pk>/hariri/', views.invoice_edit, name='invoice_edit'),
    path('<int:pk>/pdf/', views.invoice_pdf, name='invoice_pdf'),
    path('<int:pk>/hali/', views.invoice_status, name='invoice_status'),
    path('<int:pk>/futa/', views.invoice_delete, name='invoice_delete'),
    path('mteja-haraka/', views.quick_customer, name='quick_customer'),
]


