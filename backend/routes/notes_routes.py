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

UPLOAD_DIR = "uploads/notes"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/", summary="Get all notes with pagination")
async def get_notes(
    skip: int = Query(0, ge=0),
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
):
    try:
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        total = db.notes.count_documents({})
        notes = list(db.notes.find({}).skip(skip).limit(limit).sort("created_at", -1))
        logger.info(f"Retrieved {len(notes)} notes (skip={skip}, limit={limit})")
        for note in notes:
            note["id"] = note.pop("_id")
            note["created_at"] = note.get("created_at", datetime.utcnow()).isoformat()
            note["updated_at"] = note.get("updated_at", datetime.utcnow()).isoformat()
        return {
            "success": True,
            "data": notes,
            "pagination": {
                "total": total,
                "skip": skip,
                "limit": limit,
                "returned": len(notes)
            }
        }
    except Exception as e:
        logger.error(f"Error fetching notes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", dependencies=[Depends(verify_admin)], summary="Create note (admin only)")
async def create_note(
    title: str = Form(...),
    file: UploadFile = File(...),
    description: str = Form(None),
    tags: str = Form(None)
):
    try:
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        note_id = str(uuid.uuid4())
        now = datetime.utcnow()
        file_extension = os.path.splitext(file.filename)[1].lower()
        unique_filename = f"{note_id}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)

        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        doc = {
            "_id": note_id,
            "title": title,
            "description": description,
            "file_path": file_path,
            "filename": file.filename,
            "created_at": now,
            "updated_at": now,
            "tags": tags.split(",") if tags else [],
            "download_count": 0
        }
        db.notes.insert_one(doc)
        logger.info(f"Note created: {note_id}")
        return {
            "success": True,
            "message": "Note created successfully",
            "data": {"id": note_id, **doc}
        }
    except Exception as e:
        logger.error(f"Note creation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{note_id}", summary="Get specific note")
async def get_note(note_id: str):
    try:
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        note = db.notes.find_one({"_id": note_id})
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        note["id"] = note.pop("_id")
        note["created_at"] = note.get("created_at", datetime.utcnow()).isoformat()
        note["updated_at"] = note.get("updated_at", datetime.utcnow()).isoformat()
        logger.info(f"Note retrieved: {note_id}")
        return {"success": True, "data": note}
    except Exception as e:
        logger.error(f"Error fetching note {note_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{note_id}", dependencies=[Depends(verify_admin)], summary="Update note (admin only)")
async def update_note(
    note_id: str,
    title: str = Form(None),
    description: str = Form(None),
    tags: str = Form(None),
    file: UploadFile = File(None)
):
    try:
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        existing = db.notes.find_one({"_id": note_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Note not found")

        update_data = {}
        now = datetime.utcnow()
        if title:
            update_data["title"] = title
        if description:
            update_data["description"] = description
        if tags:
            update_data["tags"] = tags.split(",")
        if file:
            file_extension = os.path.splitext(file.filename)[1].lower()
            unique_filename = f"{note_id}{file_extension}"
            file_path = os.path.join(UPLOAD_DIR, unique_filename)

            content = await file.read()
            with open(file_path, "wb") as f:
                f.write(content)

            update_data["file_path"] = file_path
            update_data["filename"] = file.filename

        update_data["updated_at"] = now
        db.notes.update_one({"_id": note_id}, {"$set": update_data})
        logger.info(f"Note updated: {note_id}")
        return {"success": True, "message": "Note updated successfully"}
    except Exception as e:
        logger.error(f"Note update error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{note_id}", dependencies=[Depends(verify_admin)], summary="Delete note (admin only)")
async def delete_note(note_id: str):
    try:
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        result = db.notes.delete_one({"_id": note_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Note not found")
        logger.info(f"Note deleted: {note_id}")
        return {"success": True, "message": "Note deleted successfully"}
    except Exception as e:
        logger.error(f"Note deletion error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{note_id}/download")
async def download_note(note_id: str):
    try:
        note = db.notes.find_one({"_id": note_id})
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        db.notes.update_one({"_id": note_id}, {"$inc": {"download_count": 1}})
        file_path = note.get("file_path")
        abs_path = os.path.abspath(file_path)
        logger.info(f"Note download file path resolved to: {abs_path}")
        if not abs_path or not os.path.exists(abs_path):
            logger.error(f"File not found at path: {abs_path}")
            raise HTTPException(status_code=404, detail="File not found")
        return FileResponse(
            abs_path,
            media_type="application/octet-stream",
            filename=note.get("filename", "download")
        )
    except Exception as e:
        logger.error(f"Note download error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{note_id}/view")
async def view_note(note_id: str):
    try:
        note = db.notes.find_one({"_id": note_id})
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        file_path = note.get("file_path")
        abs_path = os.path.abspath(file_path)
        logger.info(f"Note view file path resolved to: {abs_path}")
        if not abs_path or not os.path.exists(abs_path):
            logger.error(f"File not found at path: {abs_path}")
            raise HTTPException(status_code=404, detail="File not found")
        return FileResponse(
            abs_path,
            media_type="application/pdf"
        )
    except Exception as e:
        logger.error(f"Note view error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
