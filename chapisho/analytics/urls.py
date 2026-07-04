from django.urls import path
from . import views

urlpatterns = [
    path('', views.dashboard, name='analytics_dashboard'),
    path('data/mapato/', views.revenue_by_month, name='analytics_revenue'),
    path('data/hali/', views.paid_vs_outstanding, name='analytics_status'),
    path('data/wateja-bora/', views.top_customers, name='analytics_top_customers'),
    path('data/sms/', views.sms_stats, name='analytics_sms'),
]
