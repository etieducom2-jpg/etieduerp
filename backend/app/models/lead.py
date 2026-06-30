# Lead and Follow-up Models
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid
from .enums import LeadStatus, FollowUpStatus


class LeadCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    source: str
    program_id: str
    program_name: Optional[str] = None
    status: LeadStatus = LeadStatus.NEW
    notes: Optional[str] = None
    discount_percent: float = 0.0
    discount_amount: float = 0.0
    lead_date: Optional[str] = None


class LeadUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    source: Optional[str] = None
    program_id: Optional[str] = None
    program_name: Optional[str] = None
    status: Optional[LeadStatus] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    discount_percent: Optional[float] = None
    discount_amount: Optional[float] = None
    lead_date: Optional[str] = None


class Lead(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str
    email: Optional[str] = None
    source: str
    program_id: str
    program_name: Optional[str] = None
    status: LeadStatus = LeadStatus.NEW
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    branch_id: str
    discount_percent: float = 0.0
    discount_amount: float = 0.0
    lead_date: Optional[str] = None
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    deleted_by: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class FollowUpCreate(BaseModel):
    lead_id: str
    follow_up_date: str
    notes: Optional[str] = None


class FollowUp(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    lead_id: str
    lead_name: Optional[str] = None
    follow_up_date: str
    notes: Optional[str] = None
    status: FollowUpStatus = FollowUpStatus.PENDING
    created_by: str
    branch_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
