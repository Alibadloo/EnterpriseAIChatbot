from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx
from ..services.ollama_service import list_models, check_ollama
from ..config import settings

router = APIRouter(prefix="/models", tags=["models"])

# ── curated list of popular Ollama models ──────────────────
POPULAR_MODELS = [
    {"name": "llama3.2",         "size_gb": 2.0,  "params": "3B",   "family": "Llama",    "description": "Fast & efficient, great for everyday chat"},
    {"name": "llama3.2:1b",      "size_gb": 1.3,  "params": "1B",   "family": "Llama",    "description": "Ultra-fast, minimal RAM requirement"},
    {"name": "llama3.1",         "size_gb": 4.7,  "params": "8B",   "family": "Llama",    "description": "Balanced quality and speed"},
    {"name": "llama3.1:70b",     "size_gb": 40.0, "params": "70B",  "family": "Llama",    "description": "High quality — needs 48 GB+ RAM"},
    {"name": "mistral",          "size_gb": 4.1,  "params": "7B",   "family": "Mistral",  "description": "High quality European model"},
    {"name": "mistral-nemo",     "size_gb": 7.1,  "params": "12B",  "family": "Mistral",  "description": "Large context, multilingual"},
    {"name": "mixtral",          "size_gb": 26.0, "params": "8×7B", "family": "Mixtral",  "description": "Mixture-of-Experts, high performance"},
    {"name": "gemma2",           "size_gb": 5.4,  "params": "9B",   "family": "Gemma",    "description": "Google Gemma 2, efficient and capable"},
    {"name": "gemma2:2b",        "size_gb": 1.6,  "params": "2B",   "family": "Gemma",    "description": "Very fast, good for low-end hardware"},
    {"name": "phi3.5",           "size_gb": 2.2,  "params": "3.8B", "family": "Phi",      "description": "Microsoft Phi-3.5 — smart small model"},
    {"name": "phi4",             "size_gb": 9.1,  "params": "14B",  "family": "Phi",      "description": "Microsoft Phi-4, latest generation"},
    {"name": "qwen2.5",          "size_gb": 4.7,  "params": "7B",   "family": "Qwen",     "description": "Alibaba Qwen2.5, multilingual excellence"},
    {"name": "qwen2.5:0.5b",     "size_gb": 0.4,  "params": "0.5B", "family": "Qwen",     "description": "Tiny but surprisingly capable"},
    {"name": "qwen2.5:14b",      "size_gb": 9.0,  "params": "14B",  "family": "Qwen",     "description": "Large, strong reasoning and coding"},
    {"name": "deepseek-r1",      "size_gb": 4.7,  "params": "7B",   "family": "DeepSeek", "description": "Reasoning specialist from DeepSeek"},
    {"name": "deepseek-r1:14b",  "size_gb": 9.0,  "params": "14B",  "family": "DeepSeek", "description": "Advanced reasoning — 14B version"},
    {"name": "codellama",        "size_gb": 3.8,  "params": "7B",   "family": "Code",     "description": "Meta CodeLlama — code generation"},
    {"name": "starcoder2",       "size_gb": 4.0,  "params": "7B",   "family": "Code",     "description": "StarCoder2 — multi-language coding"},
    {"name": "nomic-embed-text", "size_gb": 0.3,  "params": "137M", "family": "Embed",    "description": "Text embeddings for RAG (required for Search)"},
    {"name": "mxbai-embed-large","size_gb": 0.7,  "params": "335M", "family": "Embed",    "description": "High-quality embeddings, better RAG accuracy"},
]


# ── existing endpoints ─────────────────────────────────────

@router.get("")
async def get_models():
    ok = await check_ollama()
    if not ok:
        return {"ollama_running": False, "models": []}
    models = await list_models()
    return {
        "ollama_running": True,
        "models": [
            {
                "name": m.get("name", ""),
                "size": m.get("size"),
                "modified_at": m.get("modified_at"),
                "family": m.get("details", {}).get("family"),
                "parameters": m.get("details", {}).get("parameter_size"),
            }
            for m in models
        ],
    }

@router.get("/status")
async def ollama_status():
    return {"running": await check_ollama()}


# ── new model-management endpoints ────────────────────────

@router.get("/available")
async def get_available_models():
    """Return the curated catalogue of installable models."""
    return {"models": POPULAR_MODELS}


class PullRequest(BaseModel):
    name: str


@router.post("/pull")
async def pull_model(body: PullRequest):
    """Stream install progress for a model (SSE, forwarded from Ollama)."""
    async def _stream():
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(None)) as client:
                async with client.stream(
                    "POST",
                    f"{settings.ollama_base_url}/api/pull",
                    json={"name": body.name, "stream": True},
                ) as resp:
                    async for line in resp.aiter_lines():
                        if line.strip():
                            yield f"data: {line}\n\n"
        except Exception as exc:
            yield f'data: {{"error": "{str(exc)}"}}\n\n'

    return StreamingResponse(
        _stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.delete("/{name:path}")
async def delete_model(name: str):
    """Remove a locally installed model from Ollama."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.request(
            "DELETE",
            f"{settings.ollama_base_url}/api/delete",
            json={"name": name},
        )
    if resp.status_code not in (200, 404):
        raise HTTPException(status_code=500, detail="Ollama returned an error while deleting")
    return {"ok": True, "name": name}
