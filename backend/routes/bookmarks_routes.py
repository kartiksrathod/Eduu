from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field
from typing import Optional
import uuid
import logging
from datetime import datetime
from config import db
from routes.auth_utils import verify_token

logger = logging.getLogger(__name__)
router = APIRouter()

class BookmarkIn(BaseModel):
    resource_type: str = Field(..., description="Type: paper, note, or syllabus")
    resource_id: str = Field(..., description="ID of the resource")
    category: Optional[str] = Field(default="General", description="Bookmark category")
@router.get("/", summary="Get all bookmarks for the current user")
async def get_bookmarks(request: Request, current_user: dict = Depends(verify_token)):
    try:
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")

        user_email = current_user.get("sub")
        if not user_email:
            raise HTTPException(status_code=401, detail="User email not found in token")

        bookmarks_cursor = db.bookmarks.find({"user_email": user_email}).sort("created_at", -1)
        bookmarks = list(bookmarks_cursor) if bookmarks_cursor else []

        if not isinstance(bookmarks, list):
            bookmarks = []

        for bookmark in bookmarks:
            bookmark["id"] = str(bookmark.pop("_id"))
            bookmark["created_at"] = bookmark.get("created_at", datetime.utcnow()).isoformat()

        return {"success": True, "data": bookmarks}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching bookmarks: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/check/{resource_type}/{resource_id}", summary="Check if resource is bookmarked")
async def check_bookmark(resource_type: str, resource_id: str, request: Request, current_user: dict = Depends(verify_token)):
    try:
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")

        user_email = current_user.get("sub")
        if not user_email:
            raise HTTPException(status_code=401, detail="User email not found in token")

        if resource_type not in ["paper", "note", "syllabus"]:
            raise HTTPException(status_code=400, detail="Invalid resource type")

        bookmark = db.bookmarks.find_one({
            "user_email": user_email,
            "resource_type": resource_type,
            "resource_id": resource_id
        })

        is_bookmarked = bookmark is not None

        logger.info(f"Bookmark check for {resource_type}/{resource_id} by {user_email}: {is_bookmarked}")

        return {
            "success": True,
            "bookmarked": is_bookmarked,
            "bookmark_id": str(bookmark["_id"]) if bookmark else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking bookmark: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", summary="Create a new bookmark")
async def create_bookmark(payload: BookmarkIn, request: Request, current_user: dict = Depends(verify_token)):
    try:
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")

        user_email = current_user.get("sub")
        if not user_email:
            raise HTTPException(status_code=401, detail="User email not found in token")

        if payload.resource_type not in ["paper", "note", "syllabus"]:
            raise HTTPException(status_code=400, detail="Invalid resource type. Must be: paper, note, or syllabus")

        existing = db.bookmarks.find_one({
            "user_email": user_email,
            "resource_type": payload.resource_type,
            "resource_id": payload.resource_id
        })

        if existing:
            logger.warning(f"Bookmark already exists: {payload.resource_type}/{payload.resource_id} for {user_email}")
            return {
                "success": True,
                "message": "Bookmark already exists",
                "data": {
                    "id": str(existing["_id"]),
                    "user_email": existing["user_email"],
                    "resource_type": existing["resource_type"],
                    "resource_id": existing["resource_id"],
                    "category": existing.get("category", "General"),
                    "created_at": existing.get("created_at", datetime.utcnow()).isoformat()
                }
            }

        collection_map = {
            "paper": db.papers,
            "note": db.notes,
            "syllabus": db.syllabus
        }

        resource_collection = collection_map.get(payload.resource_type)
        resource = resource_collection.find_one({"_id": payload.resource_id})

        if not resource:
            raise HTTPException(status_code=404, detail=f"{payload.resource_type.capitalize()} not found")

        bookmark_id = str(uuid.uuid4())
        now = datetime.utcnow()

        bookmark_doc = {
            "_id": bookmark_id,
            "user_email": user_email,
            "resource_type": payload.resource_type,
            "resource_id": payload.resource_id,
            "category": payload.category or "General",
            "created_at": now
        }

        db.bookmarks.insert_one(bookmark_doc)

        logger.info(f"Bookmark created: {payload.resource_type}/{payload.resource_id} by {user_email}")

        return {
            "success": True,
            "message": "Bookmark created successfully",
            "data": {
                "id": bookmark_id,
                "user_email": user_email,
                "resource_type": payload.resource_type,
                "resource_id": payload.resource_id,
                "category": bookmark_doc["category"],
                "created_at": now.isoformat()
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating bookmark: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{resource_type}/{resource_id}", summary="Remove a bookmark")
async def delete_bookmark(resource_type: str, resource_id: str, request: Request, current_user: dict = Depends(verify_token)):
    try:
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")

        user_email = current_user.get("sub")
        if not user_email:
            raise HTTPException(status_code=401, detail="User email not found in token")

        if resource_type not in ["paper", "note", "syllabus"]:
            raise HTTPException(status_code=400, detail="Invalid resource type")

        result = db.bookmarks.delete_one({
            "user_email": user_email,
            "resource_type": resource_type,
            "resource_id": resource_id
        })

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Bookmark not found")

        logger.info(f"Bookmark deleted: {resource_type}/{resource_id} by {user_email}")

        return {
            "success": True,
            "message": "Bookmark removed successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting bookmark: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/id/{bookmark_id}", summary="Remove a bookmark by ID")
async def delete_bookmark_by_id(bookmark_id: str, request: Request, current_user: dict = Depends(verify_token)):
    try:
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")

        user_email = current_user.get("sub")
        if not user_email:
            raise HTTPException(status_code=401, detail="User email not found in token")

        bookmark = db.bookmarks.find_one({"_id": bookmark_id})

        if not bookmark:
            raise HTTPException(status_code=404, detail="Bookmark not found")

        if bookmark.get("user_email") != user_email:
            raise HTTPException(status_code=403, detail="Not authorized to delete this bookmark")

        db.bookmarks.delete_one({"_id": bookmark_id})

        logger.info(f"Bookmark deleted by ID: {bookmark_id} by {user_email}")

        return {
            "success": True,
            "message": "Bookmark removed successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting bookmark: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
