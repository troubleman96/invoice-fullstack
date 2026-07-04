import logging
from django.conf import settings
from .models import SMSLog

logger = logging.getLogger(__name__)


def send_sms(business, phone, message, invoice=None, customer=None):
    api_key = settings.AFRICASTALKING_API_KEY
    username = settings.AFRICASTALKING_USERNAME

    if not api_key:
        log = SMSLog.objects.create(
            business=business, invoice=invoice, customer=customer,
            phone=phone, message=message, status='failed',
            provider_response={'error': 'AFRICASTALKING_API_KEY haijawekwa'},
        )
        return log

    try:
        import africastalking
        africastalking.initialize(username, api_key)
        sms_service = africastalking.SMS
        sender_id = business.sms_sender_id or None
        kwargs = {}
        if sender_id:
            kwargs['sender_id'] = sender_id
        response = sms_service.send(message, [phone], **kwargs)

        status = 'sent'
        cost = None
        if isinstance(response, dict):
            data = response.get('SMSMessageData', {})
            recipients = data.get('Recipients', [])
            if recipients:
                cost_str = recipients[0].get('cost', None)
                if cost_str:
                    try:
                        cost = float(cost_str.replace('KES ', ''))
                    except (ValueError, AttributeError):
                        pass
                if recipients[0].get('status', '').lower() != 'success':
                    status = 'failed'

        log = SMSLog.objects.create(
            business=business, invoice=invoice, customer=customer,
            phone=phone, message=message, status=status,
            provider_response=response, cost=cost,
        )
        return log
    except Exception as e:
        logger.exception('SMS sending failed')
        log = SMSLog.objects.create(
            business=business, invoice=invoice, customer=customer,
            phone=phone, message=message, status='failed',
            provider_response={'error': str(e)},
        )
        return log
