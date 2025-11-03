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

UPLOAD_DIR = "uploads/papers"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("/", summary="Get all papers with pagination")
async def get_papers(
    skip: int = Query(0, ge=0),
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
):
    try:
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        total = db.papers.count_documents({})
        papers = list(db.papers.find({}).skip(skip).limit(limit).sort("created_at", -1))
        logger.info(f"Retrieved {len(papers)} papers (skip={skip}, limit={limit})")
        for paper in papers:
            paper["id"] = paper.pop("_id")
            paper["created_at"] = paper.get("created_at", datetime.utcnow()).isoformat()
            paper["updated_at"] = paper.get("updated_at", datetime.utcnow()).isoformat()
        return {
            "success": True,
            "data": papers,
            "pagination": {
                "total": total,
                "skip": skip,
                "limit": limit,
                "returned": len(papers)
            }
        }
    except Exception as e:
        logger.error(f"Error fetching papers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", dependencies=[Depends(verify_admin)], summary="Create paper (admin only)")
async def create_paper(
    title: str = Form(...),
    file: UploadFile = File(...),
    authors: str = Form(None),
    abstract: str = Form(None),
    tags: str = Form(None),
):
    try:
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        paper_id = str(uuid.uuid4())
        now = datetime.utcnow()
        file_extension = os.path.splitext(file.filename)[1].lower()
        unique_filename = f"{paper_id}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)

        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        doc = {
            "_id": paper_id,
            "title": title,
            "file_path": file_path,
            "filename": file.filename,
            "created_at": now,
            "updated_at": now,
            "authors": authors.split(",") if authors else [],
            "abstract": abstract,
            "tags": tags.split(",") if tags else [],
            "download_count": 0
        }
        db.papers.insert_one(doc)
        logger.info(f"Paper created: {paper_id}")
        return {
            "success": True,
            "message": "Paper created successfully",
            "data": {"id": paper_id, **doc}
        }
    except Exception as e:
        logger.error(f"Paper creation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{paper_id}", summary="Get specific paper")
async def get_paper(paper_id: str):
    try:
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        paper = db.papers.find_one({"_id": paper_id})
        if not paper:
            raise HTTPException(status_code=404, detail="Paper not found")
        paper["id"] = paper.pop("_id")
        paper["created_at"] = paper.get("created_at", datetime.utcnow()).isoformat()
        paper["updated_at"] = paper.get("updated_at", datetime.utcnow()).isoformat()
        logger.info(f"Paper retrieved: {paper_id}")
        return {"success": True, "data": paper}
    except Exception as e:
        logger.error(f"Error fetching paper {paper_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{paper_id}", dependencies=[Depends(verify_admin)], summary="Update paper (admin only)")
async def update_paper(
    paper_id: str,
    title: str = Form(None),
    authors: str = Form(None),
    abstract: str = Form(None),
    tags: str = Form(None),
    file: UploadFile = File(None)
):
    try:
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        existing = db.papers.find_one({"_id": paper_id})
        if not existing:
            raise HTTPException(status_code=404, detail="Paper not found")

        update_data = {}
        now = datetime.utcnow()

        if title:
            update_data["title"] = title
        if authors:
            update_data["authors"] = authors.split(",")
        if abstract:
            update_data["abstract"] = abstract
        if tags:
            update_data["tags"] = tags.split(",")

        if file:
            file_extension = os.path.splitext(file.filename)[1].lower()
            unique_filename = f"{paper_id}{file_extension}"
            file_path = os.path.join(UPLOAD_DIR, unique_filename)

            content = await file.read()
            with open(file_path, "wb") as f:
                f.write(content)

            update_data["file_path"] = file_path
            update_data["filename"] = file.filename

        update_data["updated_at"] = now
        db.papers.update_one({"_id": paper_id}, {"$set": update_data})
        logger.info(f"Paper updated: {paper_id}")
        return {
            "success": True,
            "message": "Paper updated successfully"
        }
    except Exception as e:
        logger.error(f"Paper update error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{paper_id}", dependencies=[Depends(verify_admin)], summary="Delete paper (admin only)")
async def delete_paper(paper_id: str):
    try:
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        result = db.papers.delete_one({"_id": paper_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Paper not found")
        logger.info(f"Paper deleted: {paper_id}")
        return {"success": True, "message": "Paper deleted successfully"}
    except Exception as e:
        logger.error(f"Paper deletion error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{paper_id}/download")
async def download_paper(paper_id: str):
    try:
        paper = db.papers.find_one({"_id": paper_id})
        if not paper:
            raise HTTPException(status_code=404, detail="Paper not found")
        db.papers.update_one({"_id": paper_id}, {"$inc": {"download_count": 1}})
        file_path = paper.get("file_path")
        abs_path = os.path.abspath(file_path)
        logger.info(f"Download file path resolved to: {abs_path}")
        if not abs_path or not os.path.exists(abs_path):
            logger.error(f"File not found at path: {abs_path}")
            raise HTTPException(status_code=404, detail="File not found")
        return FileResponse(
            abs_path,
            media_type="application/pdf",
            filename=paper.get("filename", "download.pdf")
        )
    except Exception as e:
        logger.error(f"Paper download error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{paper_id}/view")
async def view_paper(paper_id: str):
    try:
        paper = db.papers.find_one({"_id": paper_id})
        if not paper:
            raise HTTPException(status_code=404, detail="Paper not found")
        file_path = paper.get("file_path")
        abs_path = os.path.abspath(file_path)
        logger.info(f"View file path resolved to: {abs_path}")
        if not abs_path or not os.path.exists(abs_path):
            logger.error(f"File not found at path: {abs_path}")
            raise HTTPException(status_code=404, detail="File not found")
        return FileResponse(
            abs_path,
            media_type="application/pdf"
        )
    except Exception as e:
        logger.error(f"Paper view error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
