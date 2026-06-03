"""
TrueLens Synchronous Text Analysis Endpoint
=============================================
Provides a direct, non-queued text analysis endpoint for the Chrome extension.
Returns results immediately without Celery task queue.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import logging

from app.services.text_analysis import analyze_text_ensemble

logger = logging.getLogger(__name__)
router = APIRouter()


class TextAnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=20, description="Text to analyze for AI-generated content")


@router.post("")
def analyze_text_sync(request: TextAnalyzeRequest):
    """
    Synchronously analyzes text for AI-generated content detection.
    Returns ensemble score (transformer + stylometry) immediately.
    Used by the TrueLens Chrome extension for inline analysis.
    """
    try:
        result = analyze_text_ensemble(request.text)
        
        # Determine verdict
        score = result["score"]
        if score >= 70:
            verdict = "AI-Generated"
        elif score >= 40:
            verdict = "Mixed Signals"
        else:
            verdict = "Likely Human"
        
        return {
            "success": True,
            "trust_score": max(0, 100 - score),  # Invert: higher = more trustworthy
            "ai_score": score,  # Higher = more likely AI
            "confidence": result.get("confidence", 0),
            "verdict": verdict,
            "label": result.get("label", "Text Analysis"),
            "highlights": result.get("highlights", []),
            "evidence": result.get("evidence", {}),
        }
    except Exception as e:
        logger.error(f"Synchronous text analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Text analysis failed: {str(e)}")
