import re
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator
from enum import Enum


def validate_strong_password(v):
    if len(v) < 8:
        raise ValueError('Password must be at least 8 characters long')
    if not re.search(r'[A-Z]', v):
        raise ValueError('Password must contain at least one uppercase letter')
    if not re.search(r'\d', v):
        raise ValueError('Password must contain at least one digit')
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
        raise ValueError('Password must contain at least one special character')
    return v


class UserRegister(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    phone: str

    @field_validator('password')
    def validate_password(cls, v):
        return validate_strong_password(v)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class ForgotPassword(BaseModel):
    email: EmailStr


class ResetPassword(BaseModel):
    email: EmailStr
    code: str
    new_password: str

    @field_validator('new_password')
    def validate_password(cls, v):
        return validate_strong_password(v)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    phone: str
    role: str = "user"
    is_active: bool = True


class AdminCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str


class AdminResponse(BaseModel):
    id: str
    first_name: str
    last_name: str
    email: str
    phone: str
    created_at: datetime


class AlertCode(str, Enum):
    GREEN = "GREEN"
    YELLOW = "YELLOW"
    ORANGE = "ORANGE"
    RED = "RED"


class Location(BaseModel):
    type: str = "Point"
    coordinates: List[float] = Field(..., min_length=2, max_length=2)
    address: Optional[str] = None


class EventCreate(BaseModel):
    location: Location
    alert_code: AlertCode
    description: str
    tags: List[str] = []


class EventUpdate(BaseModel):
    location: Optional[Location] = None
    alert_code: Optional[AlertCode] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None


class EventResponse(BaseModel):
    id: str
    reported_at: datetime
    location: Location
    alert_code: AlertCode
    description: str
    image_id: Optional[str] = None
    tags: List[str]
    reporter_id: str
    created_at: datetime
