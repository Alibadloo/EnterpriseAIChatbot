from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import init_db
from .config import settings
from .routers import chat, conversations, documents, models_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    import os; os.makedirs(settings.upload_dir, exist_ok=True)
    yield

app = FastAPI(title=settings.app_name, version=settings.version, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router,          prefix="/api")
app.include_router(conversations.router, prefix="/api")
app.include_router(documents.router,     prefix="/api")
app.include_router(models_router.router, prefix="/api")

@app.get("/api/health")
async def health():
    return {"status": "ok", "version": settings.version}
