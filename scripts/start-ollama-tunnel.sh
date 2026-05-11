#!/usr/bin/env bash
set -euo pipefail

if ! command -v ollama >/dev/null 2>&1; then
  echo "Ollama is not installed. Install it from https://ollama.com/download"
  exit 1
fi

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared is not installed. Run: brew install cloudflared"
  exit 1
fi

if ! curl -fsS http://localhost:11434/api/tags >/dev/null 2>&1; then
  echo "Ollama is not running. Start it in another terminal:"
  echo "  ollama serve"
  exit 1
fi

echo "Starting Cloudflare tunnel for local Ollama..."
echo "Copy the https://*.trycloudflare.com URL into:"
echo "  backend/.env OLLAMA_BASE_URL"
echo "  Render backend environment variable OLLAMA_BASE_URL"
echo

cloudflared tunnel --url http://localhost:11434 --http-host-header localhost:11434
