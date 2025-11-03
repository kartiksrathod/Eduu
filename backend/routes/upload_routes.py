from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from fastapi.responses import FileResponse
import os
import uuid
import aiofiles
from pathlib import Path
from config import UPLOAD_DIR, MAX_FILE_SIZE, db
from routes.auth_utils import verify_admin
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# Ensure upload directories exist
PAPERS_DIR = os.path.join(UPLOAD_DIR, "papers")
NOTES_DIR = os.path.join(UPLOAD_DIR, "notes")
SYLLABUS_DIR = os.path.join(UPLOAD_DIR, "syllabus")

for directory in [PAPERS_DIR, NOTES_DIR, SYLLABUS_DIR]:
    os.makedirs(directory, exist_ok=True)

ALLOWED_EXTENSIONS = {
    "pdf": "application/pdf",
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "txt": "text/plain",
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg"
}

def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@router.post("/papers/upload", dependencies=[Depends(verify_admin)], summary="Upload paper file (admin only)")
async def upload_paper(
    file: UploadFile = File(...),
    title: str = Form(...),
    description: str = Form(None),
    authors: str = Form(None),
    tags: str = Form(None)
):
    """Upload a paper file (PDF, DOC, DOCX)"""
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        if not allowed_file(file.filename):
            raise HTTPException(
                status_code=400, 
                detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS.keys())}"
            )
        
        # Check file size
        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400, 
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE / (1024*1024)}MB"
            )
        
        # Generate unique filename
        file_extension = file.filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = os.path.join(PAPERS_DIR, unique_filename)
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(contents)
        
        # Parse tags and authors
        tags_list = [tag.strip() for tag in tags.split(",")] if tags else []
        authors_list = [author.strip() for author in authors.split(",")] if authors else []
        
        # Save to database
        paper_id = str(uuid.uuid4())
        paper = {
            "_id": paper_id,
            "title": title,
            "description": description,
            "authors": authors_list,
            "tags": tags_list,
            "file_url": f"/api/upload/papers/download/{unique_filename}",
            "file_name": file.filename,
            "file_path": file_path,
            "file_size": len(contents),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        db.papers.insert_one(paper)
        logger.info(f"Paper uploaded: {paper_id} - {file.filename}")
        
        return {
            "success": True,
            "message": "Paper uploaded successfully",
            "data": {
                "id": paper_id,
                "title": title,
                "file_url": paper["file_url"],
                "file_name": file.filename,
                "file_size": len(contents)
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading paper: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/papers/download/{filename}", summary="Download paper file")
async def download_paper(filename: str):
    """Download a paper file"""
    try:
        file_path = os.path.join(PAPERS_DIR, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type="application/octet-stream"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading paper: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/notes/upload", dependencies=[Depends(verify_admin)], summary="Upload note file (admin only)")
async def upload_note(
    file: UploadFile = File(...),
    title: str = Form(...),
    description: str = Form(None),
    content: str = Form(None),
    tags: str = Form(None)
):
    """Upload a note file (PDF, DOC, DOCX, TXT)"""
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        if not allowed_file(file.filename):
            raise HTTPException(
                status_code=400, 
                detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS.keys())}"
            )
        
        # Check file size
        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400, 
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE / (1024*1024)}MB"
            )
        
        # Generate unique filename
        file_extension = file.filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = os.path.join(NOTES_DIR, unique_filename)
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(contents)
        
        # Parse tags
        tags_list = [tag.strip() for tag in tags.split(",")] if tags else []
        
        # Save to database
        note_id = str(uuid.uuid4())
        note = {
            "_id": note_id,
            "title": title,
            "description": description,
            "content": content,
            "tags": tags_list,
            "file_url": f"/api/upload/notes/download/{unique_filename}",
            "file_name": file.filename,
            "file_path": file_path,
            "file_size": len(contents),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        db.notes.insert_one(note)
        logger.info(f"Note uploaded: {note_id} - {file.filename}")
        
        return {
            "success": True,
            "message": "Note uploaded successfully",
            "data": {
                "id": note_id,
                "title": title,
                "file_url": note["file_url"],
                "file_name": file.filename,
                "file_size": len(contents)
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading note: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/notes/download/{filename}", summary="Download note file")
async def download_note(filename: str):
    """Download a note file"""
    try:
        file_path = os.path.join(NOTES_DIR, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type="application/octet-stream"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading note: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/syllabus/upload", dependencies=[Depends(verify_admin)], summary="Upload syllabus file (admin only)")
async def upload_syllabus(
    file: UploadFile = File(...),
    title: str = Form(...),
    course_code: str = Form(None),
    branch: str = Form(None),
    year: str = Form(None),
    description: str = Form(None),
    tags: str = Form(None)
):
    """Upload a syllabus file (PDF, DOC, DOCX)"""
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        if not allowed_file(file.filename):
            raise HTTPException(
                status_code=400, 
                detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS.keys())}"
            )
        
        # Check file size
        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400, 
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE / (1024*1024)}MB"
            )
        
        # Generate unique filename
        file_extension = file.filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = os.path.join(SYLLABUS_DIR, unique_filename)
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(contents)
        
        # Parse tags
        tags_list = [tag.strip() for tag in tags.split(",")] if tags else []
        
        # Save to database
        syllabus_id = str(uuid.uuid4())
        syllabus = {
            "_id": syllabus_id,
            "title": title,
            "course_code": course_code,
            "branch": branch,
            "year": year,
            "description": description,
            "tags": tags_list,
            "file_url": f"/api/upload/syllabus/download/{unique_filename}",
            "file_name": file.filename,
            "file_path": file_path,
            "file_size": len(contents),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        db.syllabus.insert_one(syllabus)
        logger.info(f"Syllabus uploaded: {syllabus_id} - {file.filename}")
        
        return {
            "success": True,
            "message": "Syllabus uploaded successfully",
            "data": {
                "id": syllabus_id,
                "title": title,
                "file_url": syllabus["file_url"],
                "file_name": file.filename,
                "file_size": len(contents)
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading syllabus: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/syllabus/download/{filename}", summary="Download syllabus file")
async def download_syllabus(filename: str):
    """Download a syllabus file"""
    try:
        file_path = os.path.join(SYLLABUS_DIR, filename)
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type="application/octet-stream"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading syllabus: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))