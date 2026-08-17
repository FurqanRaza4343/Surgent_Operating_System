from src.config import get_settings
from src.services.cloudinary.cloudinary_service import CloudinaryService

settings = get_settings()


class StorageService:
    def __init__(self):
        self.backend = settings.storage_backend
        self.cloudinary = CloudinaryService()

    async def upload(self, file_bytes: bytes, filename: str, folder: str = "uploads") -> dict:
        if self.backend == "cloudinary":
            return await self.cloudinary.upload_from_bytes(file_bytes, filename, folder)
        raise ValueError(f"Unsupported storage backend: {self.backend}")

    async def delete(self, public_id: str):
        if self.backend == "cloudinary":
            await self.cloudinary.delete_image(public_id)
