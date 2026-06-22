import os, aiofiles
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Document
from ..schemas import DocumentOut
from ..services.rag_service import add_document, delete_document_chunks
from ..config import settings

router = APIRouter(prefix="/documents", tags=["documents"])
ALLOWED = {".pdf", ".txt", ".md"}

@router.get("", response_model=list[DocumentOut])
def list_documents(db: Session = Depends(get_db)):
    return db.query(Document).order_by(Document.created_at.desc()).all()

@router.post("", response_model=DocumentOut)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    description: str = Form(""),
    db: Session = Depends(get_db),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED:
        raise HTTPException(400, f"Unsupported type. Allowed: {', '.join(ALLOWED)}")

    os.makedirs(settings.upload_dir, exist_ok=True)
    dest = os.path.join(settings.upload_dir, file.filename)

    async with aiofiles.open(dest, "wb") as f:
        content = await file.read()
        await f.write(content)

    doc = Document(filename=file.filename, file_type=ext.lstrip("."), description=description)
    db.add(doc); db.commit(); db.refresh(doc)

    background_tasks.add_task(_index, dest, file.filename, doc.id, db)
    return doc

async def _index(path: str, filename: str, doc_id: int, db: Session):
    try:
        count = await add_document(path, filename, doc_id)
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if doc:
            doc.chunk_count = count
            db.commit()
    except Exception:
        pass

@router.delete("/{doc_id}")
async def delete_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(404, "Not found")
    await delete_document_chunks(doc_id)
    db.delete(doc)
    db.commit()
    return {"deleted": doc_id}
