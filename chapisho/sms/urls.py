from django.urls import path
from . import views

urlpatterns = [
    path('tuma/', views.sms_send, name='sms_send'),
]
