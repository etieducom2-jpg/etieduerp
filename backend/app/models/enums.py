# Enums and Base Models
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, date
import uuid


class UserRole(str, Enum):
    ADMIN = "Admin"
    BRANCH_ADMIN = "Branch Admin"
    COUNSELLOR = "Counsellor"
    FRONT_DESK = "Front Desk Executive"
    CERTIFICATE_MANAGER = "Certificate Manager"
    TRAINER = "Trainer"
    ACADEMIC_CONTROLLER = "Academic Controller"


class LeadStatus(str, Enum):
    NEW = "New"
    CONTACTED = "Contacted"
    DEMO_BOOKED = "Demo Booked"
    FOLLOW_UP = "Follow-up"
    CONVERTED = "Converted"
    LOST = "Lost"


class FollowUpStatus(str, Enum):
    PENDING = "Pending"
    COMPLETED = "Completed"
    RESCHEDULED = "Rescheduled"


class PaymentMode(str, Enum):
    CASH = "Cash"
    UPI = "UPI"
    CARD = "Card"
    BANK_TRANSFER = "Bank Transfer"
    CHEQUE = "Cheque"


class PaymentPlanType(str, Enum):
    FULL = "Full Payment"
    INSTALLMENT = "Installment"


class TaskStatus(str, Enum):
    PENDING = "Pending"
    IN_PROGRESS = "In Progress"
    COMPLETED = "Completed"


class OrganizationType(str, Enum):
    SCHOOL = "School"
    COLLEGE = "College"


class CertificateStatus(str, Enum):
    PENDING = "Pending"
    PROCESSING = "Processing"
    READY = "Ready"
    DELIVERED = "Delivered"
    REJECTED = "Rejected"


class TrainingMode(str, Enum):
    OFFLINE = "Offline"
    ONLINE = "Online"
    HYBRID = "Hybrid"


class EnrollmentStatus(str, Enum):
    ACTIVE = "Active"
    CANCELLED = "Cancelled"
    COMPLETED = "Completed"
    ON_HOLD = "On Hold"


class ResourceType(str, Enum):
    POSTER = "Poster"
    BROCHURE = "Brochure"
    BANNER = "Banner"
    SOCIAL_MEDIA = "Social Media"
    VIDEO = "Video"
    OTHER = "Other"
