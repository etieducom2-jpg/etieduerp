"""
Authentication Routes - Migrated from server.py

This module contains all authentication-related endpoints:
- POST /auth/login - User login
- POST /auth/register - User registration  
- GET /auth/me - Get current user
- GET /auth/sessions - Get available academic sessions
- GET /auth/session-stats/{session_year} - Get session statistics
"""

from fastapi import APIRouter, Depends, HTTPException, status, Form
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime, timezone, timedelta
from typing import Optional
from pydantic import BaseModel, EmailStr
from enum import Enum
import uuid

# Import from core modules
from core.deps import (
    db, pwd_context, oauth2_scheme, 
    SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES,
    get_password_hash, verify_password, create_access_token,
    get_current_user, UserRole, UserResponse
)
from core.session import (
    get_current_academic_session, 
    get_available_sessions,
    get_session_date_range
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


# Pydantic Models for Auth
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: UserRole = UserRole.COUNSELLOR
    branch_id: Optional[str] = None
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    date_of_birth: Optional[str] = None
    designation: Optional[str] = None
    photo_url: Optional[str] = None


class User(BaseModel):
    id: str = ""
    email: str
    name: str
    role: UserRole = UserRole.COUNSELLOR
    branch_id: Optional[str] = None
    phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    date_of_birth: Optional[str] = None
    designation: Optional[str] = None
    photo_url: Optional[str] = None
    hashed_password: str = ""
    is_active: bool = True
    created_at: datetime = None

    def __init__(self, **data):
        if 'id' not in data or not data['id']:
            data['id'] = str(uuid.uuid4())
        if 'created_at' not in data or not data['created_at']:
            data['created_at'] = datetime.now(timezone.utc)
        super().__init__(**data)


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
    session: Optional[str] = None


# Fixed batch timings for auto-creation when trainer is registered
FIXED_BATCH_TIMINGS = [
    {"slot": 1, "name": "Morning Batch 1", "timing": "9:00 AM - 10:30 AM"},
    {"slot": 2, "name": "Morning Batch 2", "timing": "10:30 AM - 12:00 PM"},
    {"slot": 3, "name": "Afternoon Batch 1", "timing": "12:00 PM - 1:30 PM"},
    {"slot": 4, "name": "Afternoon Batch 2", "timing": "2:30 PM - 4:00 PM"},
    {"slot": 5, "name": "Evening Batch 1", "timing": "4:00 PM - 5:30 PM"},
    {"slot": 6, "name": "Evening Batch 2", "timing": "5:30 PM - 7:00 PM"},
]


@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate):
    """Register a new user"""
    existing_user = await db.users.find_one({"email": user.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = User(
        email=user.email,
        name=user.name,
        role=user.role,
        branch_id=user.branch_id,
        phone=user.phone,
        alternate_phone=user.alternate_phone,
        address=user.address,
        city=user.city,
        state=user.state,
        pincode=user.pincode,
        date_of_birth=user.date_of_birth,
        designation=user.designation,
        photo_url=user.photo_url,
        hashed_password=get_password_hash(user.password)
    )
    
    user_dict = new_user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    # Auto-create fixed batches for Trainer role
    if user.role == UserRole.TRAINER.value and user.branch_id:
        for slot in FIXED_BATCH_TIMINGS:
            batch = {
                "id": str(uuid.uuid4()),
                "name": f"{new_user.name} - {slot['name']} ({slot['timing']})",
                "program_id": None,
                "program_name": None,
                "trainer_id": new_user.id,
                "trainer_name": new_user.name,
                "branch_id": user.branch_id,
                "timing": slot['timing'],
                "slot_number": slot['slot'],
                "max_students": 30,
                "status": "Active",
                "created_by": "system",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.batches.insert_one(batch)
    
    return UserResponse(**{k: v for k, v in new_user.model_dump().items() if k != 'hashed_password'})


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), session: Optional[str] = Form(None)):
    """Login and get access token"""
    user_doc = await db.users.find_one({"email": form_data.username}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    user = User(**user_doc)
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    # Use provided session or default to current session
    selected_session = session if session else get_current_academic_session()
    
    # Include session in JWT token
    access_token = create_access_token(data={"sub": user.email, "session": selected_session})
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(**{k: v for k, v in user.model_dump().items() if k != 'hashed_password'}),
        session=selected_session
    )


@router.get("/sessions")
async def get_sessions():
    """Get list of available academic sessions"""
    return {
        "sessions": get_available_sessions(),
        "current_session": get_current_academic_session()
    }


@router.get("/session-stats/{session_year}")
async def get_session_stats(session_year: str):
    """Get stats for a specific session (public endpoint for login page)"""
    try:
        year = int(session_year)
        start_date, end_date = get_session_date_range(session_year)
        
        if not start_date or not end_date:
            return {
                "session": session_year,
                "total_enquiries": 0,
                "converted": 0,
                "total_enrollments": 0,
                "total_collections": 0
            }
        
        date_query = {
            "created_at": {
                "$gte": start_date.isoformat(),
                "$lte": end_date.isoformat()
            }
        }
        
        # Count enquiries (leads) for this session
        total_enquiries = await db.leads.count_documents({
            **date_query,
            "is_deleted": {"$ne": True}
        })
        
        # Count converted leads
        converted = await db.leads.count_documents({
            **date_query,
            "status": "Converted",
            "is_deleted": {"$ne": True}
        })
        
        # Count enrollments
        total_enrollments = await db.enrollments.count_documents(date_query)
        
        # Calculate total collections
        payments = await db.payments.find(date_query, {"_id": 0, "amount": 1}).to_list(10000)
        total_collections = sum(p.get("amount", 0) for p in payments)
        
        return {
            "session": f"{year}-{str(year+1)[2:]}",
            "total_enquiries": total_enquiries,
            "converted": converted,
            "total_enrollments": total_enrollments,
            "total_collections": total_collections
        }
    except Exception:
        return {
            "session": session_year,
            "total_enquiries": 0,
            "converted": 0,
            "total_enrollments": 0,
            "total_collections": 0
        }


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    """Get current authenticated user"""
    return current_user
