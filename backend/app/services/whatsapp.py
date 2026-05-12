# WhatsApp Service for notifications and automations
import httpx
import logging
from datetime import datetime, timezone, timedelta
from ..config import db

logger = logging.getLogger(__name__)


async def get_whatsapp_settings():
    """Get WhatsApp settings from database"""
    settings = await db.settings.find_one({"type": "whatsapp"}, {"_id": 0})
    if not settings:
        return None
    return settings


async def send_whatsapp_notification(phone_number: str, event_type: str, template_data: dict):
    """Send WhatsApp notification using MSG91"""
    settings = await get_whatsapp_settings()
    if not settings or not settings.get('is_enabled'):
        logger.info(f"WhatsApp notifications disabled or not configured")
        return False
    
    # Check if this event type is enabled
    events_config = settings.get('events_config', {})
    event_config = events_config.get(event_type, {})
    if not event_config.get('enabled', False):
        logger.info(f"WhatsApp event {event_type} is disabled")
        return False
    
    template_name = event_config.get('template_name')
    if not template_name:
        logger.warning(f"No template configured for event {event_type}")
        return False
    
    try:
        # Send via MSG91
        auth_key = settings.get('auth_key')
        integrated_number = settings.get('integrated_number')
        namespace = settings.get('namespace', 'default')
        
        if not auth_key or not integrated_number:
            logger.error("MSG91 auth_key or integrated_number not configured")
            return False
        
        # Format phone number
        clean_phone = phone_number.replace('+', '').replace(' ', '').replace('-', '')
        if not clean_phone.startswith('91') and len(clean_phone) == 10:
            clean_phone = '91' + clean_phone
        
        # Prepare template parameters
        body_params = []
        for key, value in template_data.items():
            body_params.append({"type": "text", "text": str(value)})
        
        payload = {
            "integrated_number": integrated_number,
            "content_type": "template",
            "payload": {
                "to": clean_phone,
                "type": "template",
                "template": {
                    "name": template_name,
                    "namespace": namespace,
                    "language": {"code": "en", "policy": "deterministic"},
                    "components": [
                        {"type": "body", "parameters": body_params}
                    ]
                }
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/",
                json=payload,
                headers={
                    "authkey": auth_key,
                    "Content-Type": "application/json"
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                logger.info(f"WhatsApp sent successfully to {clean_phone} for event {event_type}")
                return True
            else:
                logger.error(f"WhatsApp send failed: {response.status_code} - {response.text}")
                return False
                
    except Exception as e:
        logger.error(f"WhatsApp send error: {e}")
        return False


async def send_fee_reminder(enrollment_id: str, days_before: int):
    """Send fee reminder for upcoming installment"""
    enrollment = await db.enrollments.find_one({"id": enrollment_id}, {"_id": 0})
    if not enrollment:
        return False
    
    # Get payment plan
    payment_plan = await db.payment_plans.find_one({"enrollment_id": enrollment_id}, {"_id": 0})
    if not payment_plan:
        return False
    
    # Find next pending installment
    installments = payment_plan.get('installments', [])
    today = datetime.now(timezone.utc).date()
    target_date = today + timedelta(days=days_before)
    
    for inst in installments:
        if inst.get('status') == 'Pending':
            due_date = datetime.fromisoformat(inst['due_date']).date() if isinstance(inst['due_date'], str) else inst['due_date']
            if due_date == target_date:
                # Send reminder
                template_data = {
                    "student_name": enrollment.get('student_name', ''),
                    "amount": inst.get('amount', 0),
                    "due_date": str(due_date),
                    "days_remaining": days_before
                }
                phone = enrollment.get('phone') or enrollment.get('student_phone', '')
                if phone:
                    return await send_whatsapp_notification(phone, 'fee_reminder', template_data)
    
    return False


async def send_birthday_wish(student_id: str):
    """Send birthday wish to student"""
    enrollment = await db.enrollments.find_one({"id": student_id}, {"_id": 0})
    if not enrollment:
        return False
    
    template_data = {
        "student_name": enrollment.get('student_name', ''),
        "program_name": enrollment.get('program_name', '')
    }
    
    phone = enrollment.get('phone') or enrollment.get('student_phone', '')
    if phone:
        return await send_whatsapp_notification(phone, 'birthday_wish', template_data)
    
    return False


async def check_and_send_fee_reminders():
    """Check all enrollments and send fee reminders for upcoming installments"""
    logger.info("Running fee reminder check...")
    
    # Get all active enrollments
    enrollments = await db.enrollments.find(
        {"status": {"$ne": "Cancelled"}},
        {"_id": 0, "id": 1}
    ).to_list(10000)
    
    reminder_days = [7, 5, 3, 1]  # Days before due date to send reminders
    sent_count = 0
    
    for enrollment in enrollments:
        for days in reminder_days:
            if await send_fee_reminder(enrollment['id'], days):
                sent_count += 1
    
    logger.info(f"Fee reminders sent: {sent_count}")
    return sent_count


async def check_and_send_birthday_wishes():
    """Check all enrollments and send birthday wishes"""
    logger.info("Running birthday wish check...")
    
    today = datetime.now(timezone.utc).strftime('%m-%d')  # MM-DD format
    
    # Get all active enrollments with birthdays today
    enrollments = await db.enrollments.find(
        {"status": {"$ne": "Cancelled"}},
        {"_id": 0, "id": 1, "date_of_birth": 1, "student_name": 1}
    ).to_list(10000)
    
    sent_count = 0
    
    for enrollment in enrollments:
        dob = enrollment.get('date_of_birth')
        if dob:
            try:
                # Extract month-day from DOB
                if isinstance(dob, str) and len(dob) >= 10:
                    dob_md = dob[5:10]  # Extract MM-DD from YYYY-MM-DD
                    if dob_md == today:
                        if await send_birthday_wish(enrollment['id']):
                            sent_count += 1
                            logger.info(f"Birthday wish sent to {enrollment.get('student_name')}")
            except Exception as e:
                logger.error(f"Error processing birthday for {enrollment['id']}: {e}")
    
    logger.info(f"Birthday wishes sent: {sent_count}")
    return sent_count
