from pydantic import BaseModel, HttpUrl, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.models.models import ContentTypeEnum, ScanStatusEnum, VerdictEnum

# -- Signals --
class SignalBase(BaseModel):
    type: str
    score: int
    label: str
    confidence: float
    evidence: Optional[Dict[str, Any]] = None
    highlights: Optional[List[str]] = None

class Signal(SignalBase):
    id: str
    scan_id: str

    class Config:
        from_attributes = True

# -- Scans --
class ScanRequest(BaseModel):
    url: Optional[HttpUrl] = None
    text: Optional[str] = None
    content_type: ContentTypeEnum

class ScanResponse(BaseModel):
    id: str
    url: Optional[str] = None
    content_type: ContentTypeEnum
    trust_score: Optional[int] = None
    verdict: Optional[VerdictEnum] = None
    status: ScanStatusEnum
    signals: List[Signal] = []
    scan_duration: Optional[float] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# -- Documents --
class DocumentFinding(BaseModel):
    type: str
    severity: str
    message: str
    field: Optional[str] = None

class DocumentSignature(BaseModel):
    documentHash: str
    signature: str
    timestamp: datetime
    publicKey: str
    scanId: str
    verdict: str

class DocumentResponse(BaseModel):
    id: str
    filename: str
    file_size: int
    file_type: str
    hash: str
    status: str
    trust_score: Optional[int] = None
    findings: List[DocumentFinding] = []
    
    # Optional flat signature fields
    signature: Optional[str] = None
    public_key: Optional[str] = None
    verified_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


