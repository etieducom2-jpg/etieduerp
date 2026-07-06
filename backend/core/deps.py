"""
Database and authentication dependencies.
"""
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import os
from enum import Enum
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db: AsyncIOMotorDatabase = client[os.environ['DB_NAME']]

# JWT Config
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


class UserRole(str, Enum):
    ADMIN = "Admin"
    BRANCH_ADMIN = "Branch Admin"
    COUNSELLOR = "Counsellor"
    FRONT_DESK = "Front Desk Executive"
    CERTIFICATE_MANAGER = "Certificate Manager"
    TRAINER = "Trainer"
    ACADEMIC_CONTROLLER = "Academic Controller"


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: UserRole
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
    is_active: Optional[bool] = True


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserResponse:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"email": email})
    if user is None:
        raise credentials_exception
    
    # Exclude MongoDB _id and hashed_password from response
    return UserResponse(
        id=user.get("id", ""),
        email=user.get("email", ""),
        name=user.get("name", ""),
        role=user.get("role", UserRole.COUNSELLOR),
        branch_id=user.get("branch_id"),
        phone=user.get("phone"),
        alternate_phone=user.get("alternate_phone"),
        address=user.get("address"),
        city=user.get("city"),
        state=user.get("state"),
        pincode=user.get("pincode"),
        date_of_birth=user.get("date_of_birth"),
        designation=user.get("designation"),
        photo_url=user.get("photo_url"),
        is_active=user.get("is_active", True)
    )


def require_role(allowed_roles: List[UserRole]):
    async def role_checker(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied for your role"
            )
        return current_user
    return role_checker


async def get_session_from_request(request: Request) -> Optional[str]:
    """Extract session from request header or query param."""
    session = request.headers.get('X-Academic-Session')
    if session:
        return session
    return request.query_params.get('session')
