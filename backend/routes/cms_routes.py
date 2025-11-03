from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/cms", tags=["CMS"])

CMS_CONTENT = {
    "welcome_message": "Welcome to EduResources CMS!",
    "latest_news": [
        {"id": 1, "title": "Semester begins soon", "content": "Get ready for the new semester."},
        {"id": 2, "title": "Holiday Schedule", "content": "Check the official holiday calendar."}
    ],
    "contact_info": {
        "email": "support@eduresources.com",
        "phone": "+1-234-567-890"
    }
}

@router.get("/content", summary="Get CMS content")
async def get_cms_content():
    try:
        return {"success": True, "data": CMS_CONTENT}
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to load CMS content")
