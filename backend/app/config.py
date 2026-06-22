from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "Enterprise AI Support Chatbot"
    version: str = "1.0.0"
    ollama_base_url: str = "http://localhost:11434"
    default_model: str = "llama3.2"
    embedding_model: str = "nomic-embed-text"
    database_url: str = "sqlite:///./chatbot.db"
    upload_dir: str = "uploads"
    chroma_dir: str = "chroma_db"
    cors_origins: list[str] = ["http://localhost:3003", "http://localhost:5173"]
    max_history_messages: int = 20
    system_prompt: str = (
        "You are a helpful enterprise support assistant. "
        "Answer questions clearly and professionally. "
        "If you don't know something, say so honestly."
    )

    class Config:
        env_file = ".env"

settings = Settings()
