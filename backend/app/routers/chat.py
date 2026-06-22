from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime
import json

from ..database import get_db
from ..models import Conversation, Message
from ..schemas import ChatRequest
from ..services.ollama_service import stream_chat, check_ollama
from ..services.rag_service import query_documents
from ..config import settings

router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("/stream")
async def chat_stream(req: ChatRequest, db: Session = Depends(get_db)):
    if not await check_ollama():
        raise HTTPException(503, "Ollama is not running. Start it with: ollama serve")

    # Get or create conversation
    if req.conversation_id:
        conv = db.query(Conversation).filter(Conversation.id == req.conversation_id).first()
        if not conv:
            raise HTTPException(404, "Conversation not found")
    else:
        conv = Conversation(
            title=req.message[:60] + ("…" if len(req.message) > 60 else ""),
            model=req.model,
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)

    # Save user message
    user_msg = Message(conversation_id=conv.id, role="user", content=req.message)
    db.add(user_msg)
    db.commit()

    # Build message history
    history = db.query(Message).filter(
        Message.conversation_id == conv.id
    ).order_by(Message.created_at).all()

    messages = [{"role": m.role, "content": m.content} for m in history[-(settings.max_history_messages):]]

    # RAG context injection
    rag_context = ""
    if req.use_rag:
        docs = await query_documents(req.message)
        if docs:
            rag_context = "\n\n--- RELEVANT DOCUMENTS ---\n" + "\n\n".join(docs) + "\n---"
            messages[-1]["content"] = req.message + rag_context

    async def generate():
        # Send conversation id first
        yield f"data: {json.dumps({'type': 'meta', 'conversation_id': conv.id})}\n\n"

        full_response = ""
        try:
            async for token in stream_chat(req.model, messages, settings.system_prompt):
                full_response += token
                yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
            return

        # Save assistant message
        ai_msg = Message(conversation_id=conv.id, role="assistant", content=full_response)
        db.add(ai_msg)
        conv.updated_at = datetime.utcnow()
        db.commit()

        yield f"data: {json.dumps({'type': 'done', 'conversation_id': conv.id})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
