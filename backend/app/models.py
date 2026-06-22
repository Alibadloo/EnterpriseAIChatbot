from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class Conversation(Base):
    __tablename__ = "conversations"

    id        = Column(Integer, primary_key=True, index=True)
    title     = Column(String(200), default="New Conversation")
    model     = Column(String(100))
    created_at= Column(DateTime, default=datetime.utcnow)
    updated_at= Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_saved  = Column(Boolean, default=False)
    messages  = relationship("Message", back_populates="conversation", cascade="all, delete")

class Message(Base):
    __tablename__ = "messages"

    id              = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    role            = Column(String(20))   # user | assistant | system
    content         = Column(Text)
    created_at      = Column(DateTime, default=datetime.utcnow)
    conversation    = relationship("Conversation", back_populates="messages")

class Document(Base):
    __tablename__ = "rag_documents"

    id           = Column(Integer, primary_key=True, index=True)
    filename     = Column(String(255))
    file_type    = Column(String(50))
    chunk_count  = Column(Integer, default=0)
    created_at   = Column(DateTime, default=datetime.utcnow)
    description  = Column(Text, nullable=True)
