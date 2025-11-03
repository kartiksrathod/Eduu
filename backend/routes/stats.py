from fastapi import APIRouter, Depends, HTTPException
from config import db
from datetime import datetime, timedelta
from routes.auth_utils import verify_token

router = APIRouter(prefix="/api/stats", tags=["Stats"])

def serialize_doc(doc):
    doc["id"] = str(doc.pop("_id"))
    for key in ("created_at", "updated_at", "verified_at"):
        if key in doc and isinstance(doc[key], datetime):
            doc[key] = doc[key].isoformat()
    return doc

@router.get("/")
async def get_stats(current_user: dict = Depends(verify_token)):
    try:
        user_email = current_user.get("sub")
        if not user_email:
            raise HTTPException(status_code=401, detail="Invalid token")
        # Total counts
        total_papers = db.papers.count_documents({})
        total_notes = db.notes.count_documents({})
        total_syllabus = db.syllabus.count_documents({})
        total_bookmarks = db.bookmarks.count_documents({})
        total_users = db.users.count_documents({})

        # User specific content count
        user_papers = db.papers.count_documents({"uploaded_by": user_email})
        user_notes = db.notes.count_documents({"created_by": user_email})
        user_syllabus = db.syllabus.count_documents({"uploaded_by": user_email})
        user_bookmarks = db.bookmarks.count_documents({"user_email": user_email})

        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_papers = db.papers.count_documents({
            "uploaded_by": user_email,
            "created_at": {"$gte": week_ago}
        })
        recent_notes = db.notes.count_documents({
            "created_by": user_email,
            "created_at": {"$gte": week_ago}
        })

        return {
            "success": True,
            "stats": {
                "total_users": total_users,
                "total_papers": total_papers,
                "total_notes": total_notes,
                "total_syllabus": total_syllabus,
                "total_bookmarks": total_bookmarks,
                "user_papers": user_papers,
                "user_notes": user_notes,
                "user_syllabus": user_syllabus,
                "user_bookmarks": user_bookmarks,
                "recent_activity": {
                    "papers_this_week": recent_papers,
                    "notes_this_week": recent_notes
                }
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch statistics: {str(e)}")
