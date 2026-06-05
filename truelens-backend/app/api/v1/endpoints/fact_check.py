from fastapi import APIRouter, HTTPException, Query
import logging
from app.services.provenance import check_google_fact_check
from app.services.live_fact_checker import evaluate_claim_live

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("")
def perform_fact_check(query: str = Query(..., min_length=3, description="The claim or phrase to fact-check")):
    """
    Directly queries the Google Fact Check API for a specific claim.
    Returns matching claims, publishers, and ratings.
    """
    try:
        result = check_google_fact_check(query)
        if not result.get("available", False):
            if "API key" in result.get("error", ""):
                raise HTTPException(status_code=503, detail="Fact-check service is not configured (API Key missing)")
            raise HTTPException(status_code=500, detail="Fact-check service unavailable")
            
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fact check failed for query '{query}': {e}")
        raise HTTPException(status_code=500, detail="An error occurred during fact-checking")

@router.get("/live")
def perform_live_ai_fact_check(query: str = Query(..., min_length=3, description="The claim or phrase to fact-check with AI")):
    """
    Actively searches the web for the claim and uses an LLM to evaluate its correctness.
    Returns a rating, reasoning, and the sources used.
    """
    try:
        result = evaluate_claim_live(query)
        if not result.get("available", False):
            error_msg = result.get("error", "AI evaluation failed")
            logger.error(f"Live AI Fact check error for query '{query}': {error_msg}")
            if "GEMINI_API_KEY" in error_msg:
                raise HTTPException(status_code=503, detail="Live AI Fact Check is not configured (GEMINI_API_KEY missing)")
            if "quota" in error_msg.lower() or "exceeded" in error_msg.lower():
                raise HTTPException(status_code=429, detail=error_msg)
            raise HTTPException(status_code=500, detail=error_msg)
            
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Live AI Fact check failed for query '{query}': {e}")
        raise HTTPException(status_code=500, detail="An error occurred during live AI fact-checking")
