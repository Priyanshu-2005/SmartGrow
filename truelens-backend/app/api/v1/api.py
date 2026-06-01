from fastapi import APIRouter
from app.api.v1.endpoints import scans, documents, domains, reviews, news, fact_check, image_verification

api_router = APIRouter()
api_router.include_router(scans.router, prefix="/scans", tags=["scans"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(domains.router, prefix="/domains", tags=["domains"])
api_router.include_router(reviews.router, prefix="/reviews", tags=["reviews"])
api_router.include_router(news.router, prefix="/news", tags=["news"])
api_router.include_router(fact_check.router, prefix="/fact-check", tags=["fact-check"])
api_router.include_router(image_verification.router, prefix="/image-verify", tags=["image-verify"])
