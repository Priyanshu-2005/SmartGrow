"""
TrueLens Documents API Endpoints
==================================
Handles document upload, analysis, signing, and retrieval.
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List
import uuid
import logging

from app.core.database import get_db
from app.models.models import Document
from app.schemas.schemas import DocumentResponse
from app.services.document_signing import generate_document_hash, sign_document_hash
from app.services.document_analysis import analyze_document
from app.services.image_analysis import analyze_image
from app.services.evidence_pack import generate_evidence_pack
from app.services.pdf_report import generate_pdf_report
from fastapi.responses import Response

logger = logging.getLogger(__name__)
router = APIRouter()

# Max file size: 10 MB
MAX_FILE_SIZE = 10 * 1024 * 1024

# Allowed file types
ALLOWED_EXTENSIONS = {'.pdf', '.png', '.jpg', '.jpeg', '.docx', '.doc'}
IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg'}


@router.post("/verify", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def verify_and_sign_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Accepts a file upload, performs real tamper detection analysis,
    hashes the document, and digitally signs it if it passes verification.

    Analysis includes:
      - PDF: metadata integrity, font consistency, OCR arithmetic validation
      - Images: OCR text extraction, document classification
      - DOCX: font analysis, metadata extraction
    Additionally for images: ELA, EXIF, and GAN fingerprint checks.
    """
    try:
        contents = await file.read()
        file_size = len(contents)

        logger.info(f"[VERIFY] Received: filename='{file.filename}', content_type='{file.content_type}', size={file_size}")

        # ── Validate file size ──
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large. Max 10MB.")

        if file_size == 0:
            raise HTTPException(status_code=400, detail="Empty file uploaded.")

        # ── Validate file extension ──
        filename = file.filename or "unknown"
        ext = '.' + filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {ext}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )

        # ── Block executable files ──
        if filename.endswith((".exe", ".sh", ".bat", ".cmd", ".ps1")):
            raise HTTPException(status_code=400, detail="Executable files are not permitted.")

        # ── Generate document hash ──
        doc_hash = generate_document_hash(contents)

        # ── Check if document already exists ──
        existing_doc = db.query(Document).filter(Document.hash == doc_hash).first()
        if existing_doc:
            return existing_doc

        # ── Run document analysis ──
        file_type = file.content_type or "application/octet-stream"
        analysis_result = analyze_document(contents, filename, file_type)

        trust_score = analysis_result["trust_score"]
        findings = analysis_result["findings"]

        # ── Run image forensics for image files ──
        if ext in IMAGE_EXTENSIONS:
            image_signals = analyze_image(contents)
            for signal in image_signals:
                # Add image forensic findings
                finding_severity = "low"
                if signal["score"] > 60:
                    finding_severity = "high"
                elif signal["score"] > 35:
                    finding_severity = "medium"

                findings.append({
                    "type": signal["label"],
                    "severity": finding_severity,
                    "message": signal["highlights"][0] if signal["highlights"] else
                               f"Score: {signal['score']}/100 — {'Pass' if signal['score'] < 40 else 'Review needed'}",
                })

                # Adjust trust score based on image analysis
                if signal["score"] > 60:
                    trust_score -= 10
                elif signal["score"] > 40:
                    trust_score -= 5

            trust_score = max(0, min(100, trust_score))

        # ── Determine status ──
        if trust_score >= 70:
            status_val = "verified"
        elif trust_score >= 40:
            status_val = "analyzing"  # Needs manual review
        else:
            status_val = "flagged"

        # ── Sign the document if it passed verification ──
        signature_data = {"signature": None, "public_key": None, "timestamp": None}
        if status_val == "verified":
            signature_data = sign_document_hash(doc_hash)

        # ── Store in database ──
        doc_id = str(uuid.uuid4())
        db_doc = Document(
            id=doc_id,
            filename=filename,
            file_size=file_size,
            file_type=file_type,
            hash=doc_hash,
            status=status_val,
            trust_score=trust_score,
            findings=findings,
            signature=signature_data.get("signature"),
            public_key=signature_data.get("public_key"),
            verified_at=signature_data.get("timestamp"),
        )

        db.add(db_doc)
        db.commit()
        db.refresh(db_doc)

        logger.info(
            f"Document {doc_id} analyzed: {filename}, "
            f"score={trust_score}, status={status_val}, "
            f"type={analysis_result.get('doc_label', 'unknown')}"
        )

        return db_doc

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Document verification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        await file.close()

from fastapi import Form

@router.post("/verify-hash", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def verify_hash_and_document(
    file: UploadFile = File(...), 
    original_hash: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Accepts a file upload and an original SHA-256 hash.
    Computes the hash of the uploaded file and compares them.
    If they match, status is authentic. If not, it runs full tamper analysis.
    """
    try:
        contents = await file.read()
        file_size = len(contents)
        
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large. Max 10MB.")
            
        filename = file.filename or "unknown"
        
        # Generate hash of uploaded file
        computed_hash = generate_document_hash(contents)
        
        findings = []
        trust_score = 100
        
        if computed_hash == original_hash:
            status_val = "verified"
            findings.append({
                "type": "Hash Match",
                "severity": "info",
                "message": "Computed hash perfectly matches the original hash."
            })
        else:
            status_val = "flagged"
            trust_score = 10  # Very low trust if hashes don't match
            findings.append({
                "type": "Hash Mismatch",
                "severity": "high",
                "message": f"Computed hash ({computed_hash[:8]}...) does NOT match original hash ({original_hash[:8]}...)."
            })
            
            # Since it's tampered, let's run deep analysis to find out why
            file_type = file.content_type or "application/octet-stream"
            ext = '.' + filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
            
            try:
                analysis_result = analyze_document(contents, filename, file_type)
                findings.extend(analysis_result["findings"])
                
                if ext in IMAGE_EXTENSIONS:
                    image_signals = analyze_image(contents)
                    for signal in image_signals:
                        findings.append({
                            "type": signal["label"],
                            "severity": "high" if signal["score"] > 60 else ("medium" if signal["score"] > 35 else "low"),
                            "message": signal["highlights"][0] if signal["highlights"] else f"Score: {signal['score']}/100",
                        })
            except Exception as e:
                logger.warning(f"Secondary analysis failed after hash mismatch: {e}")
                
        # Sign the document if it passed verification
        signature_data = {"signature": None, "public_key": None, "timestamp": None}
        if status_val == "verified":
            signature_data = sign_document_hash(computed_hash)
            
        # Store in database
        doc_id = str(uuid.uuid4())
        db_doc = Document(
            id=doc_id,
            filename=filename,
            file_size=file_size,
            file_type=file.content_type or "application/octet-stream",
            hash=computed_hash,
            status=status_val,
            trust_score=trust_score,
            findings=findings,
            signature=signature_data.get("signature"),
            public_key=signature_data.get("public_key"),
            verified_at=signature_data.get("timestamp"),
        )
        
        db.add(db_doc)
        db.commit()
        db.refresh(db_doc)
        
        return db_doc
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Document hash verification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await file.close()




@router.get("/{doc_hash}", response_model=DocumentResponse)
def get_document_by_hash(doc_hash: str, db: Session = Depends(get_db)):
    """
    Retrieves the verification status of a document via its SHA-256 hash or document ID.
    """
    # Try hash first, then try as document ID
    doc = db.query(Document).filter(Document.hash == doc_hash).first()
    if not doc:
        doc = db.query(Document).filter(Document.id == doc_hash).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found in ledger.")
    return doc

@router.get("/{doc_hash}/evidence")
def get_evidence_pack(doc_hash: str, db: Session = Depends(get_db)):
    """
    Downloads the verifiable evidence pack for a document.
    """
    doc = db.query(Document).filter(Document.hash == doc_hash).first()
    if not doc:
        doc = db.query(Document).filter(Document.id == doc_hash).first()
        
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if not doc.signature:
        raise HTTPException(status_code=400, detail="Document has not been cryptographically signed")
        
    pack = generate_evidence_pack(doc)
    return pack
@router.get("/", response_model=List[DocumentResponse])
def list_documents(skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    """
    Lists all verified documents, most recent first.
    """
    docs = db.query(Document).order_by(Document.created_at.desc()).offset(skip).limit(limit).all()
    return docs

@router.get("/{doc_hash}/report")
def get_pdf_report(doc_hash: str, db: Session = Depends(get_db)):
    """
    Generates and returns a downloadable PDF verification report.
    """
    doc = db.query(Document).filter(Document.hash == doc_hash).first()
    if not doc:
        doc = db.query(Document).filter(Document.id == doc_hash).first()
        
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    pdf_bytes = generate_pdf_report(doc)
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=TrueLens_Report_{doc.id[:8]}.pdf"
        }
    )

