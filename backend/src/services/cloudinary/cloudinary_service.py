import cloudinary
import cloudinary.uploader
import cloudinary.api

from src.config import get_settings

settings = get_settings()

cloudinary.config(
    cloud_name=settings.cloudinary_cloud_name,
    api_key=settings.cloudinary_api_key,
    api_secret=settings.cloudinary_api_secret,
    secure=True,
)


class CloudinaryService:
    async def upload_image(self, file_path: str, folder: str = "patient_photos") -> dict:
        result = cloudinary.uploader.upload(file_path, folder=folder)
        return {
            "public_id": result["public_id"],
            "url": result["secure_url"],
            "width": result.get("width"),
            "height": result.get("height"),
        }

    async def upload_from_bytes(self, file_bytes: bytes, filename: str, folder: str = "patient_photos") -> dict:
        result = cloudinary.uploader.upload(file_bytes, folder=folder, public_id=filename)
        return {
            "public_id": result["public_id"],
            "url": result["secure_url"],
        }

    async def delete_image(self, public_id: str):
        cloudinary.uploader.destroy(public_id)
