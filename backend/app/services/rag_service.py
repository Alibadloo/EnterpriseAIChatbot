import os
import asyncio
from pathlib import Path
from ..config import settings

CHROMA_DIR = settings.chroma_dir

def _get_collection():
    try:
        import chromadb
        client = chromadb.PersistentClient(path=CHROMA_DIR)
        return client.get_or_create_collection("enterprise_docs")
    except Exception as e:
        raise RuntimeError(f"ChromaDB not available: {e}")

async def add_document(file_path: str, filename: str, doc_id: int) -> int:
    from .ollama_service import generate_embeddings

    text = _extract_text(file_path)
    chunks = _chunk_text(text, chunk_size=500, overlap=50)
    collection = _get_collection()

    ids, embeddings, documents, metadatas = [], [], [], []
    for i, chunk in enumerate(chunks):
        try:
            emb = await generate_embeddings(chunk, settings.embedding_model)
            ids.append(f"doc_{doc_id}_chunk_{i}")
            embeddings.append(emb)
            documents.append(chunk)
            metadatas.append({"doc_id": doc_id, "filename": filename, "chunk": i})
        except Exception:
            # fallback: store without embedding (text-only search)
            pass

    if ids:
        collection.upsert(ids=ids, embeddings=embeddings, documents=documents, metadatas=metadatas)

    return len(chunks)

async def query_documents(query: str, n_results: int = 4) -> list[str]:
    from .ollama_service import generate_embeddings
    try:
        emb = await generate_embeddings(query, settings.embedding_model)
        collection = _get_collection()
        results = collection.query(query_embeddings=[emb], n_results=n_results)
        docs = results.get("documents", [[]])[0]
        return docs
    except Exception:
        # fallback to text search
        try:
            collection = _get_collection()
            results = collection.query(query_texts=[query], n_results=n_results)
            return results.get("documents", [[]])[0]
        except Exception:
            return []

async def delete_document_chunks(doc_id: int):
    try:
        collection = _get_collection()
        results = collection.get(where={"doc_id": doc_id})
        if results["ids"]:
            collection.delete(ids=results["ids"])
    except Exception:
        pass

def _extract_text(file_path: str) -> str:
    ext = Path(file_path).suffix.lower()
    try:
        if ext == ".pdf":
            import PyPDF2
            with open(file_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                return "\n".join(p.extract_text() or "" for p in reader.pages)
        elif ext in (".txt", ".md"):
            with open(file_path, encoding="utf-8", errors="ignore") as f:
                return f.read()
        else:
            with open(file_path, encoding="utf-8", errors="ignore") as f:
                return f.read()
    except Exception as e:
        return f"[Could not extract text: {e}]"

def _chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    words = text.split()
    chunks, i = [], 0
    while i < len(words):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
        i += chunk_size - overlap
    return chunks or [text]
