from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime
    class Config: from_attributes = True

class ConversationOut(BaseModel):
    id: int
    title: str
    model: Optional[str]
    created_at: datetime
    updated_at: datetime
    is_saved: bool
    messages: list[MessageOut] = []
    class Config: from_attributes = True

class ConversationListItem(BaseModel):
    id: int
    title: str
    model: Optional[str]
    updated_at: datetime
    is_saved: bool
    message_count: int = 0
    class Config: from_attributes = True

class ChatRequest(BaseModel):
    conversation_id: Optional[int] = None
    message: str
    model: str
    use_rag: bool = False
    stream: bool = True

class OllamaModel(BaseModel):
    name: str
    size: Optional[int] = None
    modified_at: Optional[str] = None
    family: Optional[str] = None

class DocumentOut(BaseModel):
    id: int
    filename: str
    file_type: str
    chunk_count: int
    created_at: datetime
    description: Optional[str]
    class Config: from_attributes = True
