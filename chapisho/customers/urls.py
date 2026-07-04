from django.urls import path
from . import views

urlpatterns = [
    path('', views.customer_list, name='customer_list'),
    path('mpya/', views.customer_create, name='customer_create'),
    path('<int:pk>/', views.customer_detail, name='customer_detail'),
    path('<int:pk>/hariri/', views.customer_edit, name='customer_edit'),
    path('<int:pk>/futa/', views.customer_delete, name='customer_delete'),
]
