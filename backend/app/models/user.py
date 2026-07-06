# User and Authentication Models
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid
from .enums import UserRole


class UserCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    email: EmailStr
    password: str
    name: str
    role: UserRole
    phone: Optional[str] = None
    branch_id: Optional[str] = None


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    hashed_password: str
    name: str
    role: UserRole
    phone: Optional[str] = None
    branch_id: Optional[str] = None
    is_active: bool = True
    failed_login_attempts: int = 0
    last_login: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str
    phone: Optional[str] = None
    branch_id: Optional[str] = None
    is_active: bool = True


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class UserStatusUpdate(BaseModel):
    is_active: bool


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
