import httpx
import json
from typing import AsyncGenerator
from ..config import settings

BASE = settings.ollama_base_url

async def list_models() -> list[dict]:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(f"{BASE}/api/tags")
            r.raise_for_status()
            return r.json().get("models", [])
    except Exception:
        return []

async def check_ollama() -> bool:
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(f"{BASE}/api/tags")
            return r.status_code == 200
    except Exception:
        return False

async def stream_chat(
    model: str,
    messages: list[dict],
    system: str | None = None,
) -> AsyncGenerator[str, None]:
    payload: dict = {"model": model, "messages": messages, "stream": True}
    if system:
        payload["system"] = system

    async with httpx.AsyncClient(timeout=300) as client:
        async with client.stream("POST", f"{BASE}/api/chat", json=payload) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line:
                    continue
                try:
                    data = json.loads(line)
                    token = data.get("message", {}).get("content", "")
                    if token:
                        yield token
                    if data.get("done"):
                        break
                except json.JSONDecodeError:
                    continue

async def generate_embeddings(text: str, model: str = "nomic-embed-text") -> list[float]:
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            f"{BASE}/api/embeddings",
            json={"model": model, "prompt": text}
        )
        r.raise_for_status()
        return r.json().get("embedding", [])
