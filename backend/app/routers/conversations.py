from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Conversation, Message
from ..schemas import ConversationOut, ConversationListItem

router = APIRouter(prefix="/conversations", tags=["conversations"])

@router.get("", response_model=list[ConversationListItem])
def list_conversations(db: Session = Depends(get_db)):
    convs = db.query(Conversation).order_by(Conversation.updated_at.desc()).limit(100).all()
    return [
        ConversationListItem(
            id=c.id, title=c.title, model=c.model,
            updated_at=c.updated_at, is_saved=c.is_saved,
            message_count=len(c.messages),
        )
        for c in convs
    ]

@router.get("/{conv_id}", response_model=ConversationOut)
def get_conversation(conv_id: int, db: Session = Depends(get_db)):
    c = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not c:
        raise HTTPException(404, "Not found")
    return c

@router.patch("/{conv_id}/save")
def toggle_save(conv_id: int, db: Session = Depends(get_db)):
    c = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not c:
        raise HTTPException(404, "Not found")
    c.is_saved = not c.is_saved
    db.commit()
    return {"id": c.id, "is_saved": c.is_saved}

@router.patch("/{conv_id}/title")
def rename(conv_id: int, title: str, db: Session = Depends(get_db)):
    c = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not c:
        raise HTTPException(404, "Not found")
    c.title = title[:200]
    db.commit()
    return {"id": c.id, "title": c.title}

@router.delete("/{conv_id}")
def delete_conversation(conv_id: int, db: Session = Depends(get_db)):
    c = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not c:
        raise HTTPException(404, "Not found")
    db.delete(c)
    db.commit()
    return {"deleted": conv_id}
