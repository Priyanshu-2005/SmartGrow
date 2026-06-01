import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from pydantic import BaseModel
from typing import List, Dict, Any

from app.services.deepfake_detection import detect_deepfake
from app.services.image_analysis import analyze_image

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_FILE_SIZE = 10 * 1024 * 1024
IMAGE_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp'}

class SignalResponse(BaseModel):
    type: str
    score: int
    label: str
    confidence: float
    highlights: List[str]

class ImageVerificationResponse(BaseModel):
    success: bool
    verdict: str
    trust_score: int
    signals: List[SignalResponse]

@router.post("/", response_model=ImageVerificationResponse, status_code=status.HTTP_200_OK)
async def verify_image(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        file_size = len(contents)
        
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large. Max 10MB.")
            
        filename = file.filename or "unknown"
        ext = '.' + filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
        if ext not in IMAGE_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {ext}. Allowed: {', '.join(IMAGE_EXTENSIONS)}"
            )

        logger.info(f"Running image verification on {filename}")
        
        # 1. Run new deepfake model
        deepfake_result = detect_deepfake(contents)
        
        # 2. Run existing classical signals (ELA, EXIF, GAN, OCR)
        classical_signals = analyze_image(contents)
        
        # Format the deepfake result as a signal
        df_score = 95 if deepfake_result["label"] == "Fake" else 5
        deepfake_signal = {
            "type": "deepfake",
            "score": df_score,
            "label": "Deepfake Detection (Siglip2)",
            "confidence": deepfake_result["confidence"],
            "highlights": [
                f"Prediction: {deepfake_result['label']} ({deepfake_result['confidence']*100:.1f}%)",
                f"Fake probability: {deepfake_result['probabilities'].get('Fake', 0):.3f}",
                f"Real probability: {deepfake_result['probabilities'].get('Real', 0):.3f}"
            ]
        }
        
        all_signals = [deepfake_signal] + classical_signals
        
        # Calculate combined trust score
        total_weight = 0
        weighted_score = 0
        
        # Weight deepfake model higher (60%), classical signals (40%)
        for sig in all_signals:
            weight = 0.6 if sig["type"] == "deepfake" else (0.4 / len(classical_signals) if len(classical_signals) > 0 else 0)
            conf = sig.get("confidence", 0.5)
            effective_weight = weight * conf
            
            weighted_score += sig["score"] * effective_weight
            total_weight += effective_weight
            
        avg_fake_prob = weighted_score / total_weight if total_weight > 0 else 50
        trust_score = int(100 - avg_fake_prob)
        
        verdict = "Authentic"
        if trust_score < 40:
            verdict = "AI-Generated / Deepfake"
        elif trust_score < 70:
            verdict = "Suspicious"
            
        return {
            "success": True,
            "verdict": verdict,
            "trust_score": max(0, min(100, trust_score)),
            "signals": all_signals
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Image verification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await file.close()
