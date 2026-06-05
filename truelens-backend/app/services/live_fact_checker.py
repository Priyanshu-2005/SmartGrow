"""
TrueLens Live Fact Checker
==========================
Evaluates a claim using the Gemini API with Google Search grounding.
Returns a verdict with real citations from web sources.
"""

import os
import re
import json
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

# ── Lazy-loaded Gemini client (new google-genai SDK) ──
_genai_client = None


def _get_genai_client():
    """
    Lazily initialises the google-genai Client with an API key.
    """
    global _genai_client
    if _genai_client is not None:
        return _genai_client

    try:
        from google import genai

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is not set.")

        _genai_client = genai.Client(api_key=api_key)
        return _genai_client

    except ImportError:
        raise ImportError(
            "google-genai library is not installed. "
            "Install with: pip install google-genai"
        )


def _extract_json_from_text(text: str) -> dict:
    """
    Extracts a JSON object from model text that may be wrapped in
    markdown code fences (```json ... ```) or contain extra prose.
    """
    fenced = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", text, re.DOTALL)
    if fenced:
        text = fenced.group(1)

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return json.loads(text[start : end + 1])

    raise ValueError(f"No JSON object found in model response: {text[:200]}")


def _extract_sources_from_metadata(candidate) -> List[Dict[str, str]]:
    """
    Extracts source URLs and titles from Gemini's grounding metadata.
    """
    sources: List[Dict[str, str]] = []
    seen_urls: set = set()

    try:
        grounding_metadata = getattr(candidate, "grounding_metadata", None)
        if grounding_metadata is None:
            return sources

        chunks = getattr(grounding_metadata, "grounding_chunks", None) or []
        for chunk in chunks:
            web = getattr(chunk, "web", None)
            if web is None:
                continue
            uri = getattr(web, "uri", "") or ""
            title = getattr(web, "title", "") or ""
            if uri and uri not in seen_urls:
                seen_urls.add(uri)
                sources.append({
                    "title": title or uri,
                    "snippet": "",
                    "url": uri,
                })
    except Exception as e:
        logger.warning(f"Failed to extract grounding sources: {e}")

    return sources


def evaluate_claim_live(claim: str) -> Dict[str, Any]:
    """
    Evaluates a factual claim using Gemini with Google Search grounding.
    Tries gemini-2.0-flash first, then gemini-2.0-flash-lite.

    Returns:
        {
            "available": bool,
            "rating": "TRUE" | "FALSE" | "PARTIALLY TRUE" | "UNVERIFIED",
            "short_answer": str,
            "reasoning": str,
            "confidence": "High" | "Medium" | "Low",
            "sources": [{"title": str, "snippet": str, "url": str}, ...],
            "error": str (only on failure)
        }
    """
    try:
        client = _get_genai_client()
    except Exception as e:
        return {"available": False, "error": str(e)}

    try:
        from google.genai import types

        google_search_tool = types.Tool(
            google_search=types.GoogleSearch()
        )

        prompt = f"""You are a rigorous, unbiased journalistic fact-checker. Evaluate the following claim using your knowledge and any web search results.

Claim: "{claim}"

Instructions:
1. Determine the 'rating': TRUE, FALSE, PARTIALLY TRUE, or UNVERIFIED.
2. Provide a 'short_answer': A one-sentence direct answer to the claim.
3. Provide 'reasoning': 2-3 sentences explaining how the verdict was reached.
4. Determine the 'confidence': High, Medium, or Low (based on source agreement and evidence strength).
5. You MUST output ONLY a JSON object in exactly this format (no markdown, no extra text):
{{
  "rating": "TRUE",
  "short_answer": "...",
  "reasoning": "...",
  "confidence": "High"
}}"""

        config = types.GenerateContentConfig(
            tools=[google_search_tool],
            temperature=0.0,
        )

        # Try each model once
        for model_name in ["gemini-2.5-flash", "gemini-2.5-flash-lite"]:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=config,
                )

                content = response.text
                result_dict = _extract_json_from_text(content)

                sources: List[Dict[str, str]] = []
                if response.candidates:
                    sources = _extract_sources_from_metadata(response.candidates[0])

                logger.info(f"Fact check succeeded with model={model_name}")
                return {
                    "available": True,
                    "rating": result_dict.get("rating", "UNVERIFIED"),
                    "short_answer": result_dict.get("short_answer", "No direct answer could be formulated."),
                    "reasoning": result_dict.get("reasoning", "No reasoning provided."),
                    "confidence": result_dict.get("confidence", "Low"),
                    "sources": sources,
                }

            except Exception as model_err:
                err_str = str(model_err)
                if "429" in err_str or "503" in err_str or "RESOURCE_EXHAUSTED" in err_str or "UNAVAILABLE" in err_str:
                    logger.warning(f"Gemini {model_name} error: {err_str}")
                    last_error = err_str
                    continue
                else:
                    raise model_err

        # All models exhausted
        return {
            "available": False,
            "error": f"Gemini API quota exceeded: {last_error}" if last_error else "Gemini API quota exceeded. Please wait a minute and try again.",
        }

    except Exception as e:
        logger.error(f"Live AI Fact Check error: {e}")
        return {
            "available": False,
            "error": f"Failed to evaluate claim with Gemini: {str(e)}",
        }
