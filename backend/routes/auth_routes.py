from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from routes.auth_utils import verify_token
from config import db
from datetime import datetime
import os
import uuid
from PIL import Image
import io
from pydantic import BaseModel
from passlib.context import CryptContext

router = APIRouter(prefix="/api/auth", tags=["Auth"])

UPLOAD_DIR = os.path.join(os.getcwd(), "uploads", "profile_photos")
os.makedirs(UPLOAD_DIR, exist_ok=True)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def serialize_user(user):
    if not user:
        return None
    user["id"] = str(user.pop("_id"))
    for key, value in user.items():
        if isinstance(value, datetime):
            user[key] = value.isoformat()
    user.pop("password", None)
    return user


@router.get("/profile", summary="Get current user profile")
async def get_profile(current_user: dict = Depends(verify_token)):
    user_email = current_user.get("sub")
    if not user_email:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.users.find_one({"email": user_email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"success": True, "data": serialize_user(user)}


@router.post("/profile/photo", summary="Upload user profile photo")
async def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: dict = Depends(verify_token)
):
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type")
    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large")
    try:
        image = Image.open(io.BytesIO(contents))
        image.thumbnail((400, 400), Image.Resampling.LANCZOS)
        if image.mode in ("RGBA", "LA", "P"):
            background = Image.new("RGB", image.size, (255, 255, 255))
            background.paste(image, mask=image.split()[-1] if image.mode == "RGBA" else None)
            image = background
        extension = os.path.splitext(file.filename)[1]
        filename = f"{uuid.uuid4()}{extension}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        image.save(filepath, format="JPEG", quality=85, optimize=True)
        photo_url = f"/uploads/profile_photos/{filename}"
        db.users.update_one(
            {"email": current_user["sub"]},
            {"$set": {"profile_photo": photo_url, "updated_at": datetime.now()}}
        )
        # Return updated profile for frontend refresh
        return {
    "success": True,
    "message": "Profile photo uploaded successfully",
    "photo_url": photo_url,
    "profile": serialize_user(db.users.find_one({"email": current_user["sub"]}))
}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload photo: {str(e)}")


class PasswordUpdateSchema(BaseModel):
    old_password: str
    new_password: str


@router.put("/profile/password", summary="Update user password")
async def update_password(
    data: PasswordUpdateSchema,
    current_user: dict = Depends(verify_token)
):
    user_email = current_user.get("sub")
    if not user_email:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.users.find_one({"email": user_email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Verify old password
    if not pwd_context.verify(data.old_password, user["password"]):
        raise HTTPException(status_code=400, detail="Old password is incorrect")

    # Hash new password and update
    hashed_new_password = pwd_context.hash(data.new_password)
    db.users.update_one(
        {"email": user_email},
        {"$set": {"password": hashed_new_password, "updated_at": datetime.utcnow()}}
    )
    return {"success": True, "message": "Password updated successfully"}
