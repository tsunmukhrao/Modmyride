import re
from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from pydantic import BaseModel

from app.auth import require_admin
from app.supabase import get_supabase

router = APIRouter(prefix="/api/admin/products/{product_id}/images", tags=["admin"])
MAX_FILES = 6
MAX_FILE_BYTES = 8 * 1024 * 1024
MAX_BATCH_BYTES = 20 * 1024 * 1024
MIME_EXTENSIONS = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif"}


def image_extension(mime_type: str) -> str | None:
    return MIME_EXTENSIONS.get(mime_type)


def is_supported_image_signature(mime_type: str, data: bytes) -> bool:
    if mime_type == "image/jpeg":
        return data.startswith(b"\xff\xd8\xff")
    if mime_type == "image/png":
        return data.startswith(b"\x89PNG\r\n\x1a\n")
    if mime_type == "image/webp":
        return len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP"
    if mime_type == "image/avif":
        return len(data) >= 12 and data[4:8] == b"ftyp" and data[8:12] in {b"avif", b"avis"}
    return False


def validate_image_batch(files: list[dict[str, Any]]) -> str | None:
    if not files:
        return "Choose at least one image."
    if len(files) > MAX_FILES:
        return f"Choose no more than {MAX_FILES} images at once."
    if any(item.get("type") not in MIME_EXTENSIONS for item in files):
        return "Use JPEG, PNG, WebP, or AVIF images."
    if any(not 1 <= int(item.get("size", 0)) <= MAX_FILE_BYTES for item in files):
        return "Each image must be between 1 byte and 8 MB."
    if sum(int(item.get("size", 0)) for item in files) > MAX_BATCH_BYTES:
        return "The combined image upload must be under 20 MB."
    return None


def _client(request: Request):
    return request.app.state.supabase or get_supabase(request)


async def _read_upload(file: UploadFile) -> bytes:
    data = await file.read(MAX_FILE_BYTES + 1)
    if len(data) > MAX_FILE_BYTES:
        raise HTTPException(status_code=400, detail="Each image must be between 1 byte and 8 MB.")
    return data


@router.post("")
async def upload_product_images(
    product_id: UUID,
    request: Request,
    files: list[UploadFile] = File(...),
    _admin: dict[str, Any] = Depends(require_admin),
    client: Any = Depends(get_supabase),
):
    if int(request.headers.get("content-length", "0") or 0) > MAX_BATCH_BYTES + 1_000_000:
        raise HTTPException(status_code=413, detail="Image batch exceeds 20 MB.")
    data = [await _read_upload(file) for file in files]
    problem = validate_image_batch([{"type": file.content_type, "size": len(blob)} for file, blob in zip(files, data)])
    if problem:
        raise HTTPException(status_code=400, detail=problem)
    for file, blob in zip(files, data):
        if not is_supported_image_signature(file.content_type or "", blob[:16]):
            raise HTTPException(status_code=400, detail="An uploaded image has an unsupported or invalid file signature.")
    try:
        product_result = client.table("products").select("name").eq("id", str(product_id)).limit(1).execute()
        product_rows = product_result.data or []
        if not product_rows:
            raise HTTPException(status_code=404, detail="Product not found.")
        existing = client.table("product_images").select("sort_order").eq("product_id", str(product_id)).execute().data or []
        if len(existing) + len(files) > 6:
            raise HTTPException(status_code=409, detail="A product gallery can contain at most six uploaded images.")
        start = max([-1, *(int(row.get("sort_order", 0)) for row in existing)]) + 1
        paths: list[str] = []
        rows = []
        for index, (file, blob) in enumerate(zip(files, data)):
            extension = image_extension(file.content_type or "")
            path = f"{product_id}/{uuid4()}.{extension}"
            upload = client.storage.from_("product-media").upload(path, blob, {"content-type": file.content_type, "upsert": "false"})
            if getattr(upload, "error", None):
                raise RuntimeError("Image upload failed.")
            paths.append(path)
            rows.append({"product_id": str(product_id), "storage_path": path, "alt_text": f"{product_rows[0]['name']} — view {start + index + 1}", "sort_order": start + index})
        inserted = client.table("product_images").insert(rows).execute().data or []
        urls = []
        for row in inserted:
            result = client.storage.from_("product-media").get_public_url(row["storage_path"])
            url = result.get("publicUrl", "") if isinstance(result, dict) else str(result)
            urls.append({**row, "url": url})
        return {"images": urls}
    except HTTPException:
        raise
    except Exception as exc:
        try:
            if "paths" in locals() and paths:
                client.storage.from_("product-media").remove(paths)
        except Exception:
            pass
        raise HTTPException(status_code=503, detail="Image upload or gallery update failed.") from exc


class DeleteImage(BaseModel):
    imageId: UUID


@router.delete("")
def delete_product_image(
    product_id: UUID,
    payload: DeleteImage,
    request: Request,
    _admin: dict[str, Any] = Depends(require_admin),
    client: Any = Depends(get_supabase),
):
    try:
        found = client.table("product_images").select("id,storage_path").eq("id", str(payload.imageId)).eq("product_id", str(product_id)).limit(1).execute().data or []
        if not found:
            raise HTTPException(status_code=404, detail="Product image not found.")
        client.table("product_images").delete().eq("id", str(payload.imageId)).eq("product_id", str(product_id)).execute()
        path = found[0]["storage_path"]
        cleanup_pending = False
        if not re.match(r"^https?://", path, re.IGNORECASE):
            result = client.storage.from_("product-media").remove([path])
            cleanup_pending = bool(getattr(result, "error", None))
        return {"deleted": True, "cleanupPending": cleanup_pending}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Could not remove product image.") from exc
