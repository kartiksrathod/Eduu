import os
import uuid
import logging
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request, Depends, Query, File, UploadFile, Form
from fastapi.responses import FileResponse
from config import db, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from routes.auth_utils import verify_admin, verify_token

logger = logging.getLogger(__name__)
router = APIRouter()

UPLOAD_DIR = "uploads/syllabus"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/", summary="Get all syllabi with pagination")
async def get_syllabus(
    skip: int = Query(0, ge=0),
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
):
    try:
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        total = db.syllabus.count_documents({})
        syllabi = list(db.syllabus.find({}).skip(skip).limit(limit).sort("created_at", -1))
        logger.info(f"Retrieved {len(syllabi)} syllabi (skip={skip}, limit={limit})")
        for syllabus in syllabi:
            syllabus["id"] = syllabus.pop("_id")
            syllabus["created_at"] = syllabus.get("created_at", datetime.utcnow()).isoformat()
            syllabus["updated_at"] = syllabus.get("updated_at", datetime.utcnow()).isoformat()
        return {
            "success": True,
            "data": syllabi,
            "pagination": {
                "total": total,
                "skip": skip,
                "limit": limit,
                "returned": len(syllabi)
            }
        }
    except Exception as e:
        logger.error(f"Error fetching syllabi: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", dependencies=[Depends(verify_admin)], summary="Create syllabus (admin only)")
async def create_syllabus(
    title: str = Form(...),
    file: UploadFile = File(...),
    course_code: str = Form(None),
    branch: str = Form(None),
    year: str = Form(None),
    description: str = Form(None),
    tags: str = Form(None)
):
    try:
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        syllabus_id = str(uuid.uuid4())
        now = datetime.utcnow()
        file_extension = os.path.splitext(file.filename)[1].lower()
        unique_filename = f"{syllabus_id}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)

        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        doc = {
            "_id": syllabus_id,
            "title": title,
            "course_code": course_code,
            "branch": branch,
            "year": year,
            "description": description,
            "file_path": file_path,
            "filename": file.filename,
            "created_at": now,
            "updated_at": now,
            "tags": tags.split(",") if tags else [],
            "download_count": 0
        }
        db.syllabus.insert_one(doc)
        logger.info(f"Syllabus created: {syllabus_id}")
        return {
            "success": True,
            "message": "Syllabus created successfully",
            "data": {"id": syllabus_id, **doc}
        }
    except Exception as e:
        logger.error(f"Syllabus creation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{syllabus_id}", summary="Get specific syllabus")
async def get_one_syllabus(syllabus_id: str):
    try:
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        syllabus = db.syllabus.find_one({"_id": syllabus_id})
        if not syllabus:
            raise HTTPException(status_code=404, detail="Syllabus not found")
        syllabus["id"] = syllabus.pop("_id")
        syllabus["created_at"] = syllabus.get("created_at", datetime.utcnow()).isoformat()
        syllabus["updated_at"] = syllabus.get("updated_at", datetime.utcnow()).isoformat()
        logger.info(f"Syllabus retrieved: {syllabus_id}")
        return {"success": True, "data": syllabus}
    except Exception as e:
        logger.error(f"Error fetching syllabus {syllabus_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{syllabus_id}", dependencies=[Depends(verify_admin)], summary="Update syllabus (admin only)")
async def update_syllabus(
    syllabus_id: str,
    title: str = Form(None),
    course_code: str = Form(None),
    branch: str = Form(None),
    year: str = Form(None),
    description: str = Form(None),
    tags: str = Form(None),
    file: UploadFile = File(None)
):
    try:
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        existing = db.syllabus.find_one({"_id": syllabus_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Syllabus not found")

        update_data = {}
        now = datetime.utcnow()
        if title:
            update_data["title"] = title
        if course_code:
            update_data["course_code"] = course_code
        if branch:
            update_data["branch"] = branch
        if year:
            update_data["year"] = year
        if description:
            update_data["description"] = description
        if tags:
            update_data["tags"] = tags.split(",")

        if file:
            file_extension = os.path.splitext(file.filename)[1].lower()
            unique_filename = f"{syllabus_id}{file_extension}"
            file_path = os.path.join(UPLOAD_DIR, unique_filename)

            content = await file.read()
            with open(file_path, "wb") as f:
                f.write(content)

            update_data["file_path"] = file_path
            update_data["filename"] = file.filename

        update_data["updated_at"] = now
        db.syllabus.update_one({"_id": syllabus_id}, {"$set": update_data})
        logger.info(f"Syllabus updated: {syllabus_id}")
        return {"success": True, "message": "Syllabus updated successfully"}
    except Exception as e:
        logger.error(f"Syllabus update error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{syllabus_id}", dependencies=[Depends(verify_admin)], summary="Delete syllabus (admin only)")
async def delete_syllabus(syllabus_id: str):
    try:
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        result = db.syllabus.delete_one({"_id": syllabus_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Syllabus not found")
        logger.info(f"Syllabus deleted: {syllabus_id}")
        return {"success": True, "message": "Syllabus deleted successfully"}
    except Exception as e:
        logger.error(f"Syllabus deletion error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{syllabus_id}/download")
async def download_syllabus(syllabus_id: str):
    try:
        syllabus = db.syllabus.find_one({"_id": syllabus_id})
        if not syllabus:
            raise HTTPException(status_code=404, detail="Syllabus not found")
        db.syllabus.update_one({"_id": syllabus_id}, {"$inc": {"download_count": 1}})
        file_path = syllabus.get("file_path")
        abs_path = os.path.abspath(file_path)
        logger.info(f"Syllabus download file path resolved to: {abs_path}")
        if not abs_path or not os.path.exists(abs_path):
            logger.error(f"File not found at path: {abs_path}")
            raise HTTPException(status_code=404, detail="File not found")
        return FileResponse(
            abs_path,
            media_type="application/octet-stream",
            filename=syllabus.get("filename", "download")
        )
    except Exception as e:
        logger.error(f"Syllabus download error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{syllabus_id}/view")
async def view_syllabus(syllabus_id: str):
    try:
        syllabus = db.syllabus.find_one({"_id": syllabus_id})
        if not syllabus:
            raise HTTPException(status_code=404, detail="Syllabus not found")
        file_path = syllabus.get("file_path")
        abs_path = os.path.abspath(file_path)
        logger.info(f"Syllabus view file path resolved to: {abs_path}")
        if not abs_path or not os.path.exists(abs_path):
            logger.error(f"File not found at path: {abs_path}")
            raise HTTPException(status_code=404, detail="File not found")
        return FileResponse(
            abs_path,
            media_type="application/pdf"
        )
    except Exception as e:
        logger.error(f"Syllabus view error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
