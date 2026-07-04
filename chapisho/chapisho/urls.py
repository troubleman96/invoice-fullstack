from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from invoices import views as invoice_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('core.urls')),
    path('wateja/', include('customers.urls')),
    path('ankara/', include('invoices.urls')),
    path('sms/', include('sms.urls')),
    path('takwimu/', include('analytics.urls')),
    path('p/<uuid:uuid>/', invoice_views.public_share, name='public_share'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
